#!/usr/bin/env node
/**
 * H3·A4 · M1 · Pilot v1.1 · Prepare additional pilot assets
 * ─────────────────────────────────────────────────────────
 * Crea DOS assets de prueba no críticos, controlados y aislados:
 *
 *   A) VERTICAL_REAL  — foto sintética 1600×2400 (2:3, retrato) con
 *      EXIF orientation=1 real, distinta del inventario existente.
 *      Objetivo: cerrar la brecha de cobertura vertical (Punto 1).
 *
 *   B) POISONED       — asset válido en DB, pero cuyo binario en
 *      `media-original` NO es una imagen (texto plano). Objetivo:
 *      forzar un fallo REAL de derivación (sharp() throws) sobre un
 *      asset válido y verificar el camino de failure completo
 *      (Punto 2).
 *
 * Ambos assets se marcan como `is_demo_seed=true` +
 * `demo_seed_batch='H3A4-M1-PILOT-V11'` para localización y purga.
 *
 * Reglas Founder respetadas:
 *   - No se modifican assets del inventario existente.
 *   - No se cambian superficies públicas.
 *   - `media_pipeline_enabled` sigue OFF (no lo tocamos).
 *   - Original inmutable: cada asset se sube UNA vez a `media-original`
 *     con un path único.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out");
await mkdir(OUT, { recursive: true });

const BATCH = "H3A4-M1-PILOT-V11";
const BUCKET = "media-original";

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sha256(buf) { return createHash("sha256").update(buf).digest("hex"); }

async function buildVerticalReal() {
  // 1600×2400 (retrato 2:3). Composición sintética con degradado + bandas
  // para que los tres formatos derivados (avif/webp/jpeg) tengan variación
  // real de luminancia y color (útil para inspección visual).
  const W = 1600, H = 2400;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#0e1b2c"/>
           <stop offset="0.55" stop-color="#c46b2a"/>
           <stop offset="1" stop-color="#f6d99a"/>
         </linearGradient>
       </defs>
       <rect width="100%" height="100%" fill="url(#g)"/>
       <g fill="#ffffff" font-family="serif" text-anchor="middle" opacity="0.85">
         <text x="${W/2}" y="${H*0.42}" font-size="120">Pilot v1.1</text>
         <text x="${W/2}" y="${H*0.50}" font-size="60">Vertical 2:3 · 1600×2400</text>
         <text x="${W/2}" y="${H*0.58}" font-size="48">H3·A4·M1 · test-only</text>
       </g>
       <g stroke="#ffffff" stroke-width="6" opacity="0.35" fill="none">
         <rect x="80" y="80" width="${W-160}" height="${H-160}" rx="40"/>
       </g>
     </svg>`,
  );
  const buf = await sharp(svg)
    .jpeg({ quality: 88, mozjpeg: true })
    .withMetadata({ orientation: 1, exif: {
      IFD0: {
        Copyright: "Valladolid.mx · pilot v1.1 · test-only asset",
        Software: "sharp",
      },
    } })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  return { buf, meta };
}

async function buildPoisoned() {
  // Archivo con extensión .jpg pero contenido de texto: sharp()
  // fallará al leer metadata (input is not a valid image).
  const buf = Buffer.from(
    "H3A4-M1-PILOT-V11 · POISONED · not a real image · " +
    "forced-failure test on a valid media_assets row.\n",
    "utf8",
  );
  return { buf };
}

async function upload(sb, bucket, path, buf, contentType) {
  const up = await sb.storage.from(bucket).upload(path, buf, {
    contentType, upsert: false, cacheControl: "no-store",
  });
  if (up.error) throw new Error(`upload ${bucket}/${path}: ${up.error.message}`);
}

async function insertAsset(sb, row) {
  const { data, error } = await sb.from("media_assets").insert(row).select("id").single();
  if (error) throw new Error(`insert media_assets: ${error.message}`);
  return data.id;
}

async function main() {
  const sb = admin();
  const summary = { batch: BATCH, createdAt: new Date().toISOString(), assets: {} };

  // A. VERTICAL_REAL
  const V = await buildVerticalReal();
  const vPath = `pilot-v11/vertical-2400h-${Date.now()}.jpg`;
  await upload(sb, BUCKET, vPath, V.buf, "image/jpeg");
  const vId = await insertAsset(sb, {
    kind: "image",
    storage_bucket: BUCKET,
    storage_path: vPath,
    original_bucket: BUCKET,
    original_path: vPath,
    original_mime: "image/jpeg",
    original_bytes: V.buf.length,
    original_width: V.meta.width,
    original_height: V.meta.height,
    original_checksum: sha256(V.buf),
    mime_type: "image/jpeg",
    width: V.meta.width,
    height: V.meta.height,
    size_bytes: V.buf.length,
    status: "draft",
    pipeline_status: "disabled",
    is_demo_seed: true,
    demo_seed_batch: BATCH,
    title: "Pilot v1.1 · Vertical 2:3 · test-only",
    usage_context: null,
  });
  summary.assets.vertical = { id: vId, bucket: BUCKET, path: vPath,
    width: V.meta.width, height: V.meta.height, bytes: V.buf.length,
    sha256: sha256(V.buf) };

  // B. POISONED
  const P = await buildPoisoned();
  const pPath = `pilot-v11/poisoned-${Date.now()}.jpg`;
  await upload(sb, BUCKET, pPath, P.buf, "image/jpeg");
  const pId = await insertAsset(sb, {
    kind: "image",
    storage_bucket: BUCKET,
    storage_path: pPath,
    original_bucket: BUCKET,
    original_path: pPath,
    original_mime: "image/jpeg",
    original_bytes: P.buf.length,
    original_checksum: sha256(P.buf),
    mime_type: "image/jpeg",
    size_bytes: P.buf.length,
    status: "draft",
    pipeline_status: "disabled",
    is_demo_seed: true,
    demo_seed_batch: BATCH,
    title: "Pilot v1.1 · POISONED · forced-failure test-only",
    usage_context: null,
  });
  summary.assets.poisoned = { id: pId, bucket: BUCKET, path: pPath,
    bytes: P.buf.length, sha256: sha256(P.buf) };

  const outPath = join(OUT, "prepared.json");
  await writeFile(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n→ manifest: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });