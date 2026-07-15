#!/usr/bin/env node
/**
 * H3·A4 · M1 · Pilot v1.1 · Validación visual de variantes
 * ────────────────────────────────────────────────────────
 * Descarga TODAS las variantes derivadas del asset vertical del pilot v1.1
 * y valida programáticamente (con sharp):
 *   - dimensiones (width objetivo vs alto proporcional)
 *   - orientación (EXIF autoRotate: espera orientación 1 en salida)
 *   - relación de aspecto preservada dentro de ±1%
 *   - ausencia de recorte/deformación (ratio real vs original)
 *   - decodificación exitosa por formato (avif, webp, jpeg)
 * También arma una hoja de contacto (contact sheet) para inspección visual
 * del Founder en /mnt/documents/H3A4-M1-Pilot-v11-vertical-contact-sheet.jpg
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out");
await mkdir(OUT, { recursive: true });
await mkdir("/mnt/documents", { recursive: true });

const VERTICAL_ID = "642cb15f-0a13-410c-8027-c4ab92034bf5";
const ASPECT_TOL = 0.01;

function admin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const sb = admin();

  const { data: asset, error: aErr } = await sb.from("media_assets")
    .select("original_bucket, original_path, original_width, original_height")
    .eq("id", VERTICAL_ID).single();
  if (aErr || !asset) throw new Error(`load asset: ${aErr?.message}`);
  const origAspect = asset.original_width / asset.original_height;

  const { data: variants, error: vErr } = await sb.from("media_asset_variants")
    .select("id, format, width, bytes, bucket, path, status, metadata")
    .eq("asset_id", VERTICAL_ID).order("format").order("width");
  if (vErr) throw new Error(`load variants: ${vErr.message}`);

  // Descargar original para referencia visual
  const orig = await sb.storage.from(asset.original_bucket).download(asset.original_path);
  if (orig.error) throw new Error(`orig dl: ${orig.error.message}`);
  const origBuf = Buffer.from(await orig.data.arrayBuffer());
  const origMeta = await sharp(origBuf).metadata();

  const rows = [];
  const thumbs = [];
  for (const v of variants) {
    const dl = await sb.storage.from(v.bucket).download(v.path);
    if (dl.error) { rows.push({ ...v, ok: false, error: dl.error.message }); continue; }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    let decoded, err = null, aspect = null, aspectOk = false, orientation = null;
    try {
      const s = sharp(buf, { failOn: "none" });
      const m = await s.metadata();
      decoded = { width: m.width, height: m.height, format: m.format, hasProfile: !!m.icc };
      orientation = m.orientation ?? 1;
      aspect = m.width / m.height;
      aspectOk = Math.abs(aspect - origAspect) / origAspect <= ASPECT_TOL;
    } catch (e) { err = String(e?.message ?? e); }

    rows.push({
      format: v.format, target_width: v.width, actual: decoded, orientation,
      aspect, aspect_original: origAspect, aspect_ok: aspectOk,
      width_match: decoded ? decoded.width === v.width : false,
      height_expected_within_1px: decoded ? Math.abs(decoded.height - Math.round(v.width / origAspect)) <= 1 : false,
      bytes: buf.length, db_bytes: v.bytes,
      ok: !err && aspectOk && decoded?.width === v.width,
      error: err,
    });

    // Hoja de contacto: sólo width=800 (una miniatura por formato)
    if (v.width === 800) {
      const jpg = await sharp(buf, { failOn: "none" })
        .jpeg({ quality: 82 })
        .resize({ width: 300, withoutEnlargement: true })
        .toBuffer();
      thumbs.push({ format: v.format, buf: jpg });
    }
  }

  // Original a la izquierda + AVIF/WebP/JPEG a la derecha
  const origThumb = await sharp(origBuf).jpeg({ quality: 82 }).resize({ width: 300 }).toBuffer();
  thumbs.unshift({ format: "original", buf: origThumb });

  // Composición horizontal
  const meta = await Promise.all(thumbs.map((t) => sharp(t.buf).metadata()));
  const totalW = meta.reduce((a, m) => a + m.width + 20, 20);
  const maxH = Math.max(...meta.map((m) => m.height)) + 60;
  let x = 20;
  const composites = [];
  for (let i = 0; i < thumbs.length; i++) {
    composites.push({ input: thumbs[i].buf, left: x, top: 40 });
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${meta[i].width}" height="30">
        <rect width="100%" height="100%" fill="#0e1b2c"/>
        <text x="${meta[i].width/2}" y="20" text-anchor="middle" fill="#f6d99a"
              font-family="sans-serif" font-size="16">${thumbs[i].format}</text>
      </svg>`,
    );
    composites.push({ input: label, left: x, top: 5 });
    x += meta[i].width + 20;
  }
  const contactPath = "/mnt/documents/H3A4-M1-Pilot-v11-vertical-contact-sheet.jpg";
  await sharp({
    create: { width: totalW, height: maxH, channels: 3, background: "#e9dcc3" },
  }).composite(composites).jpeg({ quality: 88 }).toFile(contactPath);

  const summary = {
    assetId: VERTICAL_ID,
    original: { width: asset.original_width, height: asset.original_height,
                aspect: origAspect, exif_orientation: origMeta.orientation ?? 1 },
    variants_checked: rows.length,
    variants_ok: rows.filter((r) => r.ok).length,
    variants_failed: rows.filter((r) => !r.ok).length,
    aspect_tolerance: ASPECT_TOL,
    contact_sheet: contactPath,
    rows,
  };
  await writeFile(join(OUT, "visual-validation.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    assetId: VERTICAL_ID,
    variants_ok: summary.variants_ok,
    variants_failed: summary.variants_failed,
    contact_sheet: contactPath,
  }, null, 2));
  if (summary.variants_failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });