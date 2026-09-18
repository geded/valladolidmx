#!/usr/bin/env node
/**
 * G8-R1-F1L-R3 · Siembra gobernada de GALERÍA documental abierta para destinos.
 *
 * Reutiliza la misma política acreditada de R2 (portadas): descarga desde
 * Wikimedia Commons con licencia explícita, normaliza, calcula checksum,
 * declara derechos y registra auditoría. No toca portadas ni textos.
 * Dry-run por defecto; escritura sólo con --apply.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "..", "r1-f1l-r2", "destination-gallery-open-media.manifest.json");
const OUT_DIR = join(HERE, "out");
const BUCKET = "studio-media";
const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;
const APPLY = process.argv.includes("--apply");

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function actorId() {
  const value = process.env.OMXDS_FOUNDER_USER_ID;
  if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error("OMXDS_FOUNDER_USER_ID requerido para una corrida aplicada");
  }
  return value;
}

async function downloadAndNormalize(item) {
  const response = await fetch(item.downloadUrl, {
    redirect: "follow",
    headers: { "user-agent": "ValladolidMX-MediaImporter/1.0 (editorial@valladolidmx.com)" },
  });
  if (!response.ok) throw new Error(`download_failed_${response.status}`);
  const mime = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!mime.startsWith("image/")) throw new Error(`not_an_image:${mime || "unknown"}`);
  const input = Buffer.from(await response.arrayBuffer());
  if (input.byteLength > MAX_DOWNLOAD_BYTES) throw new Error("download_too_large");

  const bytes = await sharp(input)
    .rotate()
    .resize({ width: 1800, height: 1350, fit: "cover", position: "attention" })
    .jpeg({ quality: 86, mozjpeg: true })
    .withMetadata({ orientation: 1 })
    .toBuffer();
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error("image_dimensions_missing");
  return { bytes, width: metadata.width, height: metadata.height, checksum: sha256(bytes) };
}

function rightsMetadata(item, manifest) {
  return {
    rights_status: "declared",
    rights_holder: item.author,
    license: item.license,
    license_url: item.licenseUrl,
    source_url: item.sourceUrl,
    documentary: true,
    conceptual: false,
    ai_generated: false,
    temporary: false,
    fixture: false,
    rights: {
      author: item.author,
      credit: item.credit,
      source: item.sourceUrl,
      license: item.license,
      license_url: item.licenseUrl,
      place: item.place,
      nature: "documentary",
      documentary: true,
      conceptual: false,
      ai_generated: false,
      rights_confirmed: true,
    },
    focal: { x: 0.5, y: 0.5 },
    governance: { batch: manifest.batch, manifest_version: manifest.schemaVersion },
  };
}

async function main() {
  const sb = admin();
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const actor = APPLY ? actorId() : null;
  const report = { batch: manifest.batch, mode: APPLY ? "apply" : "dry-run", applied: [] };

  for (const item of manifest.items) {
    const { data: destination, error } = await sb
      .from("destinations")
      .select("id, slug")
      .eq("slug", item.destinationSlug)
      .single();
    if (error) throw new Error(`destination_read:${item.destinationSlug}:${error.message}`);

    const normalized = await downloadAndNormalize(item);
    const storagePath = `open-destination-media/${item.destinationSlug}-gallery-${normalized.checksum.slice(0, 16)}.jpg`;
    if (!APPLY) {
      report.applied.push({ ...item, storagePath, sha256: normalized.checksum });
      continue;
    }

    const upload = await sb.storage
      .from(BUCKET)
      .upload(storagePath, normalized.bytes, { contentType: "image/jpeg", upsert: false });
    if (upload.error && !/already exists/i.test(upload.error.message)) throw upload.error;

    const nowIso = new Date().toISOString();
    const { data: asset, error: assetError } = await sb
      .from("media_assets")
      .upsert(
        {
          kind: "image",
          storage_bucket: BUCKET,
          storage_path: storagePath,
          alt_text: item.alt,
          alt_text_source: "human",
          credit: item.credit,
          title: item.title ?? item.place,
          mime_type: "image/jpeg",
          width: normalized.width,
          height: normalized.height,
          size_bytes: normalized.bytes.length,
          status: "published",
          review_state: "approved",
          reviewed_at: nowIso,
          reviewed_by: actor,
          entity_kind: "destination",
          entity_id: destination.id,
          usage_context: "gallery",
          pipeline_status: "ready",
          pipeline_engine: "sharp",
          pipeline_processed_at: nowIso,
          original_immutable: true,
          original_bucket: BUCKET,
          original_path: storagePath,
          original_mime: "image/jpeg",
          original_bytes: normalized.bytes.length,
          original_width: normalized.width,
          original_height: normalized.height,
          original_checksum: normalized.checksum,
          metadata: rightsMetadata(item, manifest),
          is_demo_seed: false,
          created_by: actor,
          updated_by: actor,
        },
        { onConflict: "storage_bucket,storage_path" },
      )
      .select("id")
      .single();
    if (assetError) throw assetError;

    const { error: linkError } = await sb.from("destination_media").upsert(
      {
        destination_id: destination.id,
        media_asset_id: asset.id,
        role: "gallery",
        sort_order: item.sortOrder ?? 1,
      },
      { onConflict: "destination_id,media_asset_id,role" },
    );
    if (linkError) throw linkError;

    await sb.from("content_audit_log").insert({
      entity_kind: "destination",
      entity_id: destination.id,
      action: "media.link",
      actor_user_id: actor,
      notes: "G8-R1-F1L-R3 · galería documental abierta acreditada",
      metadata: {
        batch: manifest.batch,
        media_asset_id: asset.id,
        source_url: item.sourceUrl,
        license: item.license,
        checksum: normalized.checksum,
      },
    });

    report.applied.push({
      destinationSlug: item.destinationSlug,
      mediaAssetId: asset.id,
      storagePath,
      sha256: normalized.checksum,
      sourceUrl: item.sourceUrl,
    });
  }

  await mkdir(OUT_DIR, { recursive: true });
  const reportPath = join(OUT_DIR, `${manifest.batch}-${Date.now()}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
