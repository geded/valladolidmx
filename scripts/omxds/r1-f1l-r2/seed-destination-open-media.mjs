#!/usr/bin/env node
/**
 * G8-R1-F1L-R2 · Siembra gobernada de portadas abiertas para destinos.
 *
 * - No usa fixtures ni cambia el texto de las entidades.
 * - Sólo procesa la allowlist documental del manifiesto vecino.
 * - Conserva cualquier portada ya acreditada.
 * - Descarga, normaliza, calcula checksum, acredita derechos y registra auditoría.
 * - Es dry-run por defecto. La escritura exige --apply + service role + Founder ID.
 * - Cada corrida aplicada genera un reporte suficiente para --rollback=<archivo>.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "destination-open-media.manifest.json");
const OUT_DIR = join(HERE, "out");
const BUCKET = "studio-media";
const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;
const APPLY = process.argv.includes("--apply");
const rollbackArg = process.argv.find((arg) => arg.startsWith("--rollback="));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function founderId() {
  const value = process.env.OMXDS_FOUNDER_USER_ID;
  if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error("OMXDS_FOUNDER_USER_ID requerido para una corrida aplicada");
  }
  return value;
}

function isAccredited(asset) {
  const metadata = asset?.metadata && typeof asset.metadata === "object" ? asset.metadata : {};
  return Boolean(
    asset &&
    asset.storage_bucket !== "demo-media" &&
    asset.is_demo_seed !== true &&
    asset.status === "published" &&
    asset.deleted_at == null &&
    asset.review_state === "approved" &&
    asset.pipeline_status === "ready" &&
    asset.original_checksum &&
    asset.alt_text &&
    asset.credit &&
    metadata.rights_status === "declared" &&
    metadata.rights_holder &&
    metadata.license,
  );
}

async function downloadAndNormalize(item) {
  const response = await fetch(item.downloadUrl, {
    redirect: "follow",
    headers: { "user-agent": "ValladolidMX-MediaImporter/1.0 (editorial@valladolidmx.com)" },
  });
  if (!response.ok) throw new Error(`download_failed_${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_DOWNLOAD_BYTES) throw new Error("download_too_large");
  const mime = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!mime.startsWith("image/")) throw new Error(`not_an_image:${mime || "unknown"}`);
  const input = Buffer.from(await response.arrayBuffer());
  if (input.byteLength > MAX_DOWNLOAD_BYTES) throw new Error("download_too_large");

  const output = await sharp(input)
    .rotate()
    .resize({ width: 2000, height: 1400, fit: "cover", position: "attention" })
    .jpeg({ quality: 88, mozjpeg: true })
    .withMetadata({ orientation: 1 })
    .toBuffer();
  const metadata = await sharp(output).metadata();
  if (!metadata.width || !metadata.height) throw new Error("image_dimensions_missing");
  return {
    bytes: output,
    width: metadata.width,
    height: metadata.height,
    checksum: sha256(output),
  };
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

async function readDestination(sb, slug) {
  const { data, error } = await sb
    .from("destinations")
    .select(
      "id, slug, name, hero_media_id, media_assets:hero_media_id(id, storage_bucket, storage_path, status, deleted_at, is_demo_seed, review_state, pipeline_status, original_checksum, alt_text, credit, metadata)",
    )
    .eq("slug", slug)
    .single();
  if (error) throw new Error(`destination_read:${slug}:${error.message}`);
  return data;
}

async function rollback(sb, reportPath) {
  if (!APPLY) throw new Error("El rollback exige --apply");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  for (const entry of [...report.applied].reverse()) {
    await sb.from("destination_media").delete().eq("media_asset_id", entry.newMediaAssetId);
    if (entry.previousCoverMediaAssetId) {
      await sb.from("destination_media").upsert(
        {
          destination_id: entry.destinationId,
          media_asset_id: entry.previousCoverMediaAssetId,
          role: "cover",
          sort_order: 0,
        },
        { onConflict: "destination_id,media_asset_id,role" },
      );
    }
    await sb
      .from("destinations")
      .update({ hero_media_id: entry.previousHeroMediaAssetId ?? null })
      .eq("id", entry.destinationId);
    await sb
      .from("media_assets")
      .update({ status: "draft", deleted_at: new Date().toISOString() })
      .eq("id", entry.newMediaAssetId);
    await sb.storage.from(BUCKET).remove([entry.storagePath]);
  }
  console.log(JSON.stringify({ rolledBack: report.applied.length, report: reportPath }, null, 2));
}

async function main() {
  const sb = admin();
  if (rollbackArg) return rollback(sb, rollbackArg.slice("--rollback=".length));

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const actor = APPLY ? founderId() : null;
  const report = {
    batch: manifest.batch,
    mode: APPLY ? "apply" : "dry-run",
    createdAt: new Date().toISOString(),
    applied: [],
    skipped: [],
  };

  for (const item of manifest.items) {
    const destination = await readDestination(sb, item.destinationSlug);
    if (isAccredited(destination.media_assets)) {
      report.skipped.push({
        destinationSlug: item.destinationSlug,
        reason: "accredited_cover_exists",
      });
      continue;
    }
    const normalized = await downloadAndNormalize(item);
    const storagePath = `open-destination-media/${item.destinationSlug}-${normalized.checksum.slice(0, 16)}.jpg`;
    if (!APPLY) {
      report.applied.push({
        destinationId: destination.id,
        destinationSlug: item.destinationSlug,
        storagePath,
        sha256: normalized.checksum,
        width: normalized.width,
        height: normalized.height,
        sourceUrl: item.sourceUrl,
      });
      continue;
    }

    const { data: previousCoverRows, error: coverReadError } = await sb
      .from("destination_media")
      .select("media_asset_id")
      .eq("destination_id", destination.id)
      .eq("role", "cover");
    if (coverReadError) throw coverReadError;
    const previousCoverMediaAssetId = previousCoverRows?.[0]?.media_asset_id ?? null;

    const upload = await sb.storage
      .from(BUCKET)
      .upload(storagePath, normalized.bytes, { contentType: "image/jpeg", upsert: false });
    if (upload.error && !/already exists/i.test(upload.error.message)) throw upload.error;

    const metadata = rightsMetadata(item, manifest);
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
          title: item.place,
          mime_type: "image/jpeg",
          width: normalized.width,
          height: normalized.height,
          size_bytes: normalized.bytes.length,
          status: "published",
          review_state: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: actor,
          entity_kind: "destination",
          entity_id: destination.id,
          usage_context: "hero",
          pipeline_status: "ready",
          pipeline_engine: "sharp",
          pipeline_processed_at: new Date().toISOString(),
          original_immutable: true,
          original_bucket: BUCKET,
          original_path: storagePath,
          original_mime: "image/jpeg",
          original_bytes: normalized.bytes.length,
          original_width: normalized.width,
          original_height: normalized.height,
          original_checksum: normalized.checksum,
          metadata,
          is_demo_seed: false,
          created_by: actor,
          updated_by: actor,
        },
        { onConflict: "storage_bucket,storage_path" },
      )
      .select("id")
      .single();
    if (assetError) throw assetError;

    await sb
      .from("destination_media")
      .delete()
      .eq("destination_id", destination.id)
      .eq("role", "cover");
    const { error: linkError } = await sb.from("destination_media").insert({
      destination_id: destination.id,
      media_asset_id: asset.id,
      role: "cover",
      sort_order: 0,
    });
    if (linkError) throw linkError;
    const { error: destinationError } = await sb
      .from("destinations")
      .update({ hero_media_id: asset.id, updated_by: actor })
      .eq("id", destination.id);
    if (destinationError) throw destinationError;
    const { error: auditError } = await sb.from("content_audit_log").insert({
      entity_kind: "destination",
      entity_id: destination.id,
      action: "media.link",
      actor_user_id: actor,
      notes: "G8-R1-F1L-R2 · portada documental abierta acreditada",
      metadata: {
        batch: manifest.batch,
        media_asset_id: asset.id,
        source_url: item.sourceUrl,
        license: item.license,
        checksum: normalized.checksum,
        previous_hero_media_asset_id: destination.hero_media_id,
        previous_cover_media_asset_id: previousCoverMediaAssetId,
      },
    });
    if (auditError) throw auditError;

    report.applied.push({
      destinationId: destination.id,
      destinationSlug: item.destinationSlug,
      newMediaAssetId: asset.id,
      previousHeroMediaAssetId: destination.hero_media_id,
      previousCoverMediaAssetId,
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
