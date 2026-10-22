/**
 * H3·A4 · Cargador server-only de variantes `ready` para fichas públicas.
 *
 * Fail-closed: cualquier error devuelve un mapa vacío y la superficie
 * conserva exactamente la foto original de hoy. Una sola consulta batched
 * (sin N+1). Las URLs de variantes se construyen sólo vía
 * `toDerivedPublicMediaUrl` (Transparent Derivation Principle).
 */
import type { MediaAssetInput, MediaUsageContext, MediaVariantFormat } from "./resolve-source";
import { toDerivedPublicMediaUrl } from "./derived-public-url";
import { isMediaPipelineEnabled } from "./pipeline-flag.server";

/**
 * Piloto de comparación visual (sólo fuera de producción). Mientras el
 * interruptor global esté apagado, únicamente estas fichas leen variantes
 * en preview. En el sitio publicado nada cambia hasta encender el flag.
 */
export const MEDIA_PIPELINE_PILOT_BUSINESS_SLUGS: ReadonlySet<string> = new Set(["hotel-sutuk"]);

export async function shouldServeVariantsForBusiness(slug: string | null | undefined) {
  if (await isMediaPipelineEnabled()) return true;
  if (process.env.NODE_ENV === "production") return false;
  return Boolean(slug && MEDIA_PIPELINE_PILOT_BUSINESS_SLUGS.has(slug));
}

export interface AssetBaseForVariants {
  id: string;
  file_url: string;
  width: number | null;
  height: number | null;
  pipeline_status: string | null;
}

export async function attachReadyVariants(
  assets: AssetBaseForVariants[],
): Promise<Record<string, MediaAssetInput>> {
  const out: Record<string, MediaAssetInput> = {};
  const ready = assets.filter((a) => a.pipeline_status === "ready");
  if (ready.length === 0) return out;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("media_asset_variants")
      .select("asset_id, format, width, height, bucket, path, usage_context, variant_key")
      .in(
        "asset_id",
        ready.map((a) => a.id),
      )
      .eq("status", "ready")
      .eq("is_current", true);
    if (error || !data) return out;
    for (const a of ready) {
      const variants = data
        .filter((v) => v.asset_id === a.id)
        .map((v) => {
          const url = toDerivedPublicMediaUrl(v.bucket, v.path);
          return url
            ? {
                format: v.format as MediaVariantFormat,
                width: v.width,
                height: v.height,
                url,
                status: "ready" as const,
                usage_context: (v.usage_context as MediaUsageContext | null) ?? null,
                variant_key: v.variant_key ?? null,
              }
            : null;
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
      if (variants.length === 0) continue;
      out[a.id] = {
        id: a.id,
        file_url: a.file_url,
        original_width: a.width,
        original_height: a.height,
        pipeline_status: "ready",
        variants,
      };
    }
  } catch {
    return {};
  }
  return out;
}
