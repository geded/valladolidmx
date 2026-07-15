#!/usr/bin/env node
/**
 * H3·A4 · M1 · First-Vertical Derivation CLI (sharp self-hosted)
 * ─────────────────────────────────────────────────────────────────
 * Primera vertical productiva controlada del Media Pipeline.
 *
 * Reglas M1 (Founder-vinculantes):
 *   1. Original inmutable: NUNCA se escribe en `media-original`.
 *   2. Derivación reproducible: cada variante declara asset_id,
 *      engine, engine_version, format, width, quality, timestamp y
 *      content_hash (sha256 del binario derivado + source_checksum).
 *   3. Idempotencia: si existe una variante `ready` con mismo
 *      engine+engine_version+quality+source_checksum, no se re-genera.
 *   4. Contrato público estable: este script NO cambia superficies
 *      públicas. El feature flag `media_pipeline_enabled` sigue OFF.
 *   5. Fallback: fallos por variante se registran (status='failed')
 *      y NO promocionan el asset; el resolver seguirá sirviendo el
 *      original legacy (`resolveMediaSource()`).
 *   6. Activación controlada: sólo procesa los asset IDs listados
 *      por CLI (`--asset-id=<uuid>` o `--file=<lista.txt>`).
 *   7. Observabilidad: reporte JSON completo bajo `out/{runId}.json`.
 *
 * Uso:
 *   node scripts/media-pipeline/derive.mjs --asset-id=<uuid> [--asset-id=<uuid2>]
 *   node scripts/media-pipeline/derive.mjs --file=scripts/media-pipeline/samples.txt
 *   node scripts/media-pipeline/derive.mjs --asset-id=<uuid> --dry-run
 *
 * Env requeridas:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (nunca versionar).
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "out");

const ENGINE = "sharp";
async function detectEngineVersion() {
  try {
    const p = join(__dirname, "..", "..", "node_modules", "sharp", "package.json");
    const raw = await readFile(p, "utf8");
    return `sharp@${JSON.parse(raw).version}`;
  } catch { return "sharp@unknown"; }
}
const ENGINE_VERSION = await detectEngineVersion();

// Matriz oficial por contexto (adenda benchmark M0).
const MATRIX = {
  hero:       { widths: [800, 1200, 1600, 2000], formats: ["avif", "webp", "jpeg"], quality: { avif: 50, webp: 75, jpeg: 82 } },
  card:       { widths: [400, 800, 1200],        formats: ["avif", "webp", "jpeg"], quality: { avif: 50, webp: 75, jpeg: 80 } },
  gallery:    { widths: [800, 1200, 1600],       formats: ["avif", "webp", "jpeg"], quality: { avif: 52, webp: 78, jpeg: 82 } },
  thumbnail:  { widths: [200, 400],              formats: ["avif", "webp", "jpeg"], quality: { avif: 45, webp: 72, jpeg: 78 } },
  og:         { widths: [1200],                  formats: ["jpeg"],                 quality: { jpeg: 85 } },
  editorial:  { widths: [800, 1200, 1600],       formats: ["avif", "webp", "jpeg"], quality: { avif: 55, webp: 80, jpeg: 85 } },
  logo:       { widths: [200, 400, 800],         formats: ["webp", "png"],          quality: { webp: 90, png: 100 } },
  icon:       { widths: [64, 128, 256],          formats: ["webp", "png"],          quality: { webp: 90, png: 100 } },
  generic:    { widths: [400, 800, 1200],        formats: ["avif", "webp", "jpeg"], quality: { avif: 50, webp: 75, jpeg: 80 } },
};

function parseArgs(argv) {
  const out = { assetIds: [], file: null, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--asset-id=")) out.assetIds.push(a.slice("--asset-id=".length));
    else if (a.startsWith("--file=")) out.file = a.slice("--file=".length);
  }
  return out;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas en el entorno.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function deriveOne(sb, assetId, report, dryRun) {
  const t0 = performance.now();
  const perAsset = { assetId, variants: [], errors: [], skipped: 0, generated: 0, failed: 0 };
  report.assets.push(perAsset);

  // 1. Cargar asset
  const { data: asset, error: aErr } = await sb
    .from("media_assets")
    .select("id, file_url, original_bucket, original_path, original_checksum, original_bytes, original_width, usage_context, pipeline_status")
    .eq("id", assetId)
    .maybeSingle();
  if (aErr || !asset) {
    perAsset.errors.push(`asset not found: ${aErr?.message ?? "no row"}`);
    return;
  }

  // 2. Descargar original
  let originalBuf;
  if (asset.original_bucket && asset.original_path) {
    const dl = await sb.storage.from(asset.original_bucket).download(asset.original_path);
    if (dl.error || !dl.data) {
      perAsset.errors.push(`download failed from ${asset.original_bucket}/${asset.original_path}: ${dl.error?.message}`);
      return;
    }
    originalBuf = Buffer.from(await dl.data.arrayBuffer());
  } else if (asset.file_url) {
    // Legacy fallback (asset heredado sin original_bucket/path aún). Sólo lectura.
    const res = await fetch(asset.file_url);
    if (!res.ok) {
      perAsset.errors.push(`legacy fetch ${asset.file_url} → HTTP ${res.status}`);
      return;
    }
    originalBuf = Buffer.from(await res.arrayBuffer());
  } else {
    perAsset.errors.push("asset has no original_bucket/path nor file_url");
    return;
  }

  const sourceChecksum = asset.original_checksum || sha256(originalBuf);
  perAsset.source_checksum = sourceChecksum;
  perAsset.source_bytes = originalBuf.length;

  const meta = await sharp(originalBuf).metadata();
  const ctx = asset.usage_context || "generic";
  const plan = MATRIX[ctx] || MATRIX.generic;

  // 3. Cargar variantes existentes (idempotencia)
  const { data: existing } = await sb
    .from("media_asset_variants")
    .select("id, format, width, engine, status, metadata")
    .eq("asset_id", assetId)
    .eq("engine", ENGINE);

  const existingIndex = new Map(
    (existing ?? []).map((v) => [`${v.format}:${v.width}`, v]),
  );

  // 4. Marcar asset como processing (best-effort, no bloqueante)
  if (!dryRun) {
    await sb.from("media_assets").update({ pipeline_status: "processing", pipeline_engine: ENGINE }).eq("id", assetId);
  }

  // 5. Derivar y subir
  for (const format of plan.formats) {
    for (const width of plan.widths) {
      if (meta.width && meta.width < width) continue;
      const key = `${format}:${width}`;
      const prev = existingIndex.get(key);
      const quality = plan.quality?.[format] ?? null;

      if (
        prev &&
        prev.status === "ready" &&
        prev.metadata?.engine_version === ENGINE_VERSION &&
        prev.metadata?.quality === quality &&
        prev.metadata?.source_checksum === sourceChecksum
      ) {
        perAsset.skipped++;
        perAsset.variants.push({ format, width, status: "skipped-idempotent" });
        continue;
      }

      const path = `${assetId}/${ENGINE}/${ENGINE_VERSION.replace(/[^\w.@-]/g, "_")}/${ctx}/${format}/${width}.${format === "jpeg" ? "jpg" : format}`;

      let out, dt;
      try {
        const t = performance.now();
        let pipe = sharp(originalBuf).resize({ width, withoutEnlargement: true });
        if (format === "avif") out = await pipe.avif({ quality, effort: 4 }).toBuffer();
        else if (format === "webp") out = await pipe.webp({ quality }).toBuffer();
        else if (format === "jpeg") out = await pipe.jpeg({ quality, mozjpeg: true }).toBuffer();
        else if (format === "png") out = await pipe.png({ compressionLevel: 9 }).toBuffer();
        dt = performance.now() - t;
      } catch (e) {
        perAsset.failed++;
        perAsset.variants.push({ format, width, status: "failed", error: String(e?.message ?? e) });
        if (!dryRun) {
          await sb.from("media_asset_variants").upsert(
            [{
              asset_id: assetId, engine: ENGINE, format, width, quality,
              bucket: "media-derived", path, usage_context: ctx,
              status: "failed", error: String(e?.message ?? e),
              metadata: { engine_version: ENGINE_VERSION, source_checksum: sourceChecksum, quality, generated_at: new Date().toISOString() },
            }],
            { onConflict: "asset_id,format,width,engine" },
          );
        }
        continue;
      }

      const contentHash = sha256(out);

      if (!dryRun) {
        const up = await sb.storage.from("media-derived").upload(path, out, {
          contentType: `image/${format === "jpeg" ? "jpeg" : format}`,
          upsert: true,
          cacheControl: "public, max-age=31536000, immutable",
        });
        if (up.error) {
          perAsset.failed++;
          perAsset.variants.push({ format, width, status: "failed", error: `upload: ${up.error.message}` });
          continue;
        }

        const { error: upsertErr } = await sb.from("media_asset_variants").upsert(
          [{
            asset_id: assetId, engine: ENGINE, format, width, quality,
            bucket: "media-derived", path, usage_context: ctx,
            bytes: out.length, checksum: contentHash,
            processing_ms: Math.round(dt),
            status: "ready", error: null,
            metadata: {
              engine_version: ENGINE_VERSION,
              source_checksum: sourceChecksum,
              content_hash: contentHash,
              quality,
              generated_at: new Date().toISOString(),
            },
          }],
          { onConflict: "asset_id,format,width,engine" },
        );
        if (upsertErr) {
          perAsset.failed++;
          perAsset.variants.push({ format, width, status: "failed", error: `db: ${upsertErr.message}` });
          continue;
        }
      }

      perAsset.generated++;
      const reduction = perAsset.source_bytes ? +(100 - (out.length * 100) / perAsset.source_bytes).toFixed(1) : null;
      perAsset.variants.push({
        format, width, quality, bytes: out.length, processing_ms: Math.round(dt),
        reduction_pct: reduction, content_hash: contentHash, status: dryRun ? "dry-run" : "ready",
      });
    }
  }

  // 6. Promocionar asset sólo si TODAS las variantes planificadas están ok
  const allOk = perAsset.failed === 0 && perAsset.errors.length === 0;
  if (!dryRun) {
    await sb.from("media_assets").update({
      pipeline_status: allOk ? "ready" : "failed",
      pipeline_engine: ENGINE,
      pipeline_processed_at: new Date().toISOString(),
      pipeline_last_error: allOk ? null : `M1: ${perAsset.failed} variant(s) failed`,
    }).eq("id", assetId);
  }

  perAsset.total_ms = Math.round(performance.now() - t0);
}

async function main() {
  const args = parseArgs(process.argv);
  let ids = [...args.assetIds];
  if (args.file) {
    const contents = await readFile(args.file, "utf8");
    ids.push(...contents.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
  }
  ids = Array.from(new Set(ids));
  if (ids.length === 0) {
    console.error("No asset IDs provided. Use --asset-id=<uuid> or --file=<list.txt>");
    process.exit(2);
  }
  console.log(`H3·A4·M1 · derive · engine=${ENGINE_VERSION} · assets=${ids.length} · dryRun=${args.dryRun}`);

  const sb = admin();
  await mkdir(OUT_DIR, { recursive: true });
  const runId = crypto.randomUUID();
  const report = { runId, engine: ENGINE_VERSION, startedAt: new Date().toISOString(), dryRun: args.dryRun, assets: [] };

  for (const id of ids) {
    console.log(`\n→ ${id}`);
    try { await deriveOne(sb, id, report, args.dryRun); }
    catch (e) { console.error(`  fatal: ${e?.message ?? e}`); report.assets.push({ assetId: id, fatal: String(e?.message ?? e) }); }
  }

  report.finishedAt = new Date().toISOString();
  const outPath = join(OUT_DIR, `${runId}.json`);
  await writeFile(outPath, JSON.stringify(report, null, 2));

  const totals = report.assets.reduce((a, r) => ({
    generated: a.generated + (r.generated || 0),
    skipped: a.skipped + (r.skipped || 0),
    failed: a.failed + (r.failed || 0),
  }), { generated: 0, skipped: 0, failed: 0 });
  console.log(`\n✓ run ${runId} · generated=${totals.generated} skipped=${totals.skipped} failed=${totals.failed}`);
  console.log(`  report → ${outPath}`);
  if (totals.failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
