/**
 * H3·A4 · M2.2 · Shadow Preloader (server-only)
 *
 * Precarga determinística y batched del bundle {asset, variants[]} para
 * evaluar hipotéticamente el read path M2. Alcance estricto:
 *
 *  - Sólo server-side (import prohibido desde bundles cliente).
 *  - Sólo asset(s) presentes en `SHADOW_ALLOWLIST`. Cualquier id ajeno se
 *    descarta silenciosamente (no se filtra desde el cliente).
 *  - Sólo variantes `is_current=true AND status='ready'`.
 *  - Selecciona únicamente las columnas necesarias para la decisión y la
 *    telemetría (nunca `original_checksum`, nunca `metadata`, nunca datos
 *    personales/atribución/EXIF, nunca URLs firmadas).
 *  - Ejecuta como máximo 2 queries totales sin importar cuántos assets se
 *    pidan (una a `media_assets` y una a `media_asset_variants` con IN),
 *    para garantizar ausencia de N+1 y query-count estable.
 *  - Tiene timeout duro. Ante fallo → devuelve `{assets:{}, error}` y el
 *    evaluador cae a `fallback_reason='storage_unreachable'` sin afectar
 *    ningún render público.
 *  - Nunca modifica el HTML público ni serializa nada al navegador.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SHADOW_ALLOWLIST } from "./shadow-evaluator.server";
import type { MediaUsageContext, MediaVariantFormat } from "./resolve-source";

/** Timeout duro por query — mantiene el evaluador dentro de SLA. */
const DB_TIMEOUT_MS = 1500;

export interface PreloadedAsset {
  id: string;
  original_width: number | null;
  original_height: number | null;
  pipeline_status:
    | "disabled"
    | "pending"
    | "processing"
    | "ready"
    | "failed"
    | "skipped"
    | null;
  has_original_checksum: boolean;
}

export interface PreloadedVariant {
  format: MediaVariantFormat;
  width: number;
  height: number | null;
  bucket: string;
  path: string;
  variant_key: string | null;
  usage_context: MediaUsageContext | null;
}

export interface PreloadedBundle {
  asset: PreloadedAsset;
  variants: PreloadedVariant[];
}

export interface PreloadResult {
  /** Diccionario `assetId -> bundle`. Vacío si no hubo assets elegibles. */
  assets: Record<string, PreloadedBundle>;
  /** Latencia total de las queries (ms). */
  latencyMs: number;
  /** Número de queries realmente ejecutadas contra la DB (0..2). */
  queryCount: number;
  /** Error opacado si algo salió mal — no se propaga a superficie pública. */
  error?: "db_timeout" | "db_error";
}

/** Ejecuta una promesa con timeout duro; devuelve `null` si expira. */
async function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | { __timeout: true }> {
  return await Promise.race([
    Promise.resolve(p),
    new Promise<{ __timeout: true }>((resolve) =>
      setTimeout(() => resolve({ __timeout: true }), ms),
    ),
  ]);
}

function isTimeout(v: unknown): v is { __timeout: true } {
  return typeof v === "object" && v !== null && (v as { __timeout?: boolean }).__timeout === true;
}

/**
 * Precarga el bundle para un conjunto de assetIds. Aplica la allowlist
 * server-side antes de tocar la DB.
 */
export async function preloadShadowAssetBundles(
  requested: readonly string[],
  deps?: { supabase?: typeof supabaseAdmin },
): Promise<PreloadResult> {
  const client = deps?.supabase ?? supabaseAdmin;
  const started = Date.now();
  const ids = Array.from(
    new Set(requested.filter((id) => typeof id === "string" && SHADOW_ALLOWLIST.has(id))),
  );
  if (ids.length === 0) {
    return { assets: {}, latencyMs: Date.now() - started, queryCount: 0 };
  }

  // Query 1: media_assets — columnas mínimas.
  const assetsQ = client
    .from("media_assets")
    .select("id, original_width, original_height, pipeline_status, original_checksum")
    .in("id", ids);
  const assetsRes = await withTimeout(assetsQ, DB_TIMEOUT_MS);
  if (isTimeout(assetsRes)) {
    return { assets: {}, latencyMs: Date.now() - started, queryCount: 1, error: "db_timeout" };
  }
  const { data: assetRows, error: assetsErr } = assetsRes as { data: unknown[] | null; error: unknown };
  if (assetsErr || !assetRows) {
    return { assets: {}, latencyMs: Date.now() - started, queryCount: 1, error: "db_error" };
  }

  // Query 2: media_asset_variants — IN (ids), columnas mínimas, filtros server-side.
  const variantsQ = client
    .from("media_asset_variants")
    .select("asset_id, format, width, height, bucket, path, variant_key, usage_context")
    .in("asset_id", ids)
    .eq("is_current", true)
    .eq("status", "ready");
  const variantsRes = await withTimeout(variantsQ, DB_TIMEOUT_MS);
  if (isTimeout(variantsRes)) {
    return { assets: {}, latencyMs: Date.now() - started, queryCount: 2, error: "db_timeout" };
  }
  const { data: variantRows, error: variantsErr } = variantsRes as { data: unknown[] | null; error: unknown };
  if (variantsErr || !variantRows) {
    return { assets: {}, latencyMs: Date.now() - started, queryCount: 2, error: "db_error" };
  }

  // Ensamblado en memoria. NO se serializa `original_checksum`; sólo un booleano.
  const bundle: Record<string, PreloadedBundle> = {};
  for (const raw of assetRows as Array<Record<string, unknown>>) {
    const id = String(raw.id);
    if (!SHADOW_ALLOWLIST.has(id)) continue;
    bundle[id] = {
      asset: {
        id,
        original_width: raw.original_width == null ? null : Number(raw.original_width),
        original_height: raw.original_height == null ? null : Number(raw.original_height),
        pipeline_status: (raw.pipeline_status as PreloadedAsset["pipeline_status"]) ?? null,
        has_original_checksum:
          typeof raw.original_checksum === "string" &&
          raw.original_checksum.length > 0 &&
          raw.original_checksum !== "-",
      },
      variants: [],
    };
  }
  for (const raw of variantRows as Array<Record<string, unknown>>) {
    const assetId = String(raw.asset_id);
    const b = bundle[assetId];
    if (!b) continue;
    b.variants.push({
      format: raw.format as MediaVariantFormat,
      width: Number(raw.width),
      height: raw.height == null ? null : Number(raw.height),
      bucket: String(raw.bucket),
      path: String(raw.path),
      variant_key: raw.variant_key == null ? null : String(raw.variant_key),
      usage_context: (raw.usage_context as MediaUsageContext | null) ?? null,
    });
  }

  return {
    assets: bundle,
    latencyMs: Date.now() - started,
    queryCount: 2,
  };
}

/** Conveniencia mono-asset — reutiliza el batched loader. */
export async function preloadShadowAssetBundle(
  assetId: string,
  deps?: { supabase?: typeof supabaseAdmin },
): Promise<{ bundle: PreloadedBundle | null; result: PreloadResult }> {
  const result = await preloadShadowAssetBundles([assetId], deps);
  return { bundle: result.assets[assetId] ?? null, result };
}