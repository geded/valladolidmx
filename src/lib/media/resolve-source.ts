/**
 * H3·A4 · M0 · resolveMediaSource()
 *
 * FUENTE ÚNICA OFICIAL para obtener la fuente renderizable de un
 * `media_asset` en cualquier superficie pública. Ningún componente
 * puede construir manualmente URLs, formatos, anchos, paths ni
 * `srcSet` de variantes derivadas (Founder Transparent Derivation
 * Principle).
 *
 * Contrato:
 *   1. Si el pipeline está listo y hay variantes `ready` para el
 *      contexto/anchos solicitados → responde con `srcSet` moderno
 *      (AVIF → WebP → JPEG) más `canonical` legacy como fallback.
 *   2. Si el pipeline está apagado/pendiente/fallido → responde con
 *      la URL legacy (`file_url`) preservando dimensiones y sin
 *      producir URLs rotas.
 *   3. Nunca depende del navegador durante el primer render (SSR
 *      safe). Todo el trabajo se hace con la información ya
 *      contenida en el asset y sus variantes precargadas.
 *
 * Founder Stable Public Asset Contract:
 *   `canonical` es la URL pública estable indexada. Las URLs internas
 *   de variantes (`media-derived/...`) NO son canónicas y pueden
 *   evolucionar libremente sin afectar SEO.
 */

export type MediaUsageContext =
  | "hero"
  | "card"
  | "gallery"
  | "thumbnail"
  | "og"
  | "editorial"
  | "logo"
  | "icon"
  | "generic";

export type MediaVariantFormat = "avif" | "webp" | "jpeg" | "png";

export interface MediaVariantInput {
  format: MediaVariantFormat;
  width: number;
  height?: number | null;
  url: string;
  bytes?: number | null;
  status?: "pending" | "processing" | "ready" | "failed";
  usage_context?: MediaUsageContext | null;
}

export interface MediaAssetInput {
  id: string;
  file_url: string | null;
  original_width?: number | null;
  original_height?: number | null;
  original_mime?: string | null;
  pipeline_status?:
    | "disabled"
    | "pending"
    | "processing"
    | "ready"
    | "failed"
    | "skipped"
    | null;
  variants?: MediaVariantInput[] | null;
}

export interface ResolveMediaSourceOptions {
  context?: MediaUsageContext;
  targetWidth?: number;
  densities?: number[];
  fallbackUrl?: string;
}

export interface ResolvedMediaSource {
  canonical: string;
  src: string;
  sources: Array<{ type: string; srcSet: string; sizes?: string }>;
  width?: number;
  height?: number;
  usedPipeline: boolean;
  pipelineStatus: NonNullable<MediaAssetInput["pipeline_status"]> | "unknown";
}

const MIME_BY_FORMAT: Record<MediaVariantFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

function buildSrcSet(variants: MediaVariantInput[]): string {
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  const parts: string[] = [];
  const emitted = new Set<number>();
  for (const v of sorted) {
    if (emitted.has(v.width)) continue;
    emitted.add(v.width);
    parts.push(`${v.url} ${v.width}w`);
  }
  return parts.join(", ");
}

export function resolveMediaSource(
  asset: MediaAssetInput | null | undefined,
  options: ResolveMediaSourceOptions = {},
): ResolvedMediaSource {
  const fallback = options.fallbackUrl ?? "";
  const canonical = (asset?.file_url?.trim() || fallback) ?? "";
  const pipelineStatus = (asset?.pipeline_status ?? "unknown") as
    | NonNullable<MediaAssetInput["pipeline_status"]>
    | "unknown";

  const baseResult: ResolvedMediaSource = {
    canonical,
    src: canonical,
    sources: [],
    width: asset?.original_width ?? undefined,
    height: asset?.original_height ?? undefined,
    usedPipeline: false,
    pipelineStatus,
  };

  if (!asset) return baseResult;

  const variants = (asset.variants ?? []).filter(
    (v) => v && v.url && (v.status === undefined || v.status === "ready"),
  );

  if (pipelineStatus !== "ready" || variants.length === 0) {
    return baseResult;
  }

  const contextFilter = options.context ?? "generic";
  const contextual = variants.filter(
    (v) => !v.usage_context || v.usage_context === contextFilter,
  );
  const pool = contextual.length > 0 ? contextual : variants;

  const byFormat = new Map<MediaVariantFormat, MediaVariantInput[]>();
  for (const v of pool) {
    const arr = byFormat.get(v.format) ?? [];
    arr.push(v);
    byFormat.set(v.format, arr);
  }

  const sources: ResolvedMediaSource["sources"] = [];
  for (const fmt of ["avif", "webp"] as const) {
    const list = byFormat.get(fmt);
    if (list && list.length > 0) {
      sources.push({
        type: MIME_BY_FORMAT[fmt],
        srcSet: buildSrcSet(list),
      });
    }
  }

  const jpegList = byFormat.get("jpeg") ?? [];
  let src = canonical;
  if (jpegList.length > 0) {
    const target = options.targetWidth ?? asset.original_width ?? jpegList[0].width;
    const chosen = jpegList
      .slice()
      .sort((a, b) => Math.abs(a.width - target) - Math.abs(b.width - target))[0];
    src = chosen.url;
  }

  return {
    canonical,
    src,
    sources,
    width: asset.original_width ?? undefined,
    height: asset.original_height ?? undefined,
    usedPipeline: true,
    pipelineStatus: "ready",
  };
}

export function isMediaPipelineReady(
  asset: MediaAssetInput | null | undefined,
): boolean {
  if (!asset) return false;
  if (asset.pipeline_status !== "ready") return false;
  return (asset.variants ?? []).some(
    (v) => v.status === undefined || v.status === "ready",
  );
}
