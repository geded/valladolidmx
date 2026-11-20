/**
 * H3·A4 · Ruta pública (no canónica) de las variantes derivadas.
 *
 * Fuente única para construir la URL servida por
 * `src/routes/api/public/media-derived.$.ts`. Ningún componente puede
 * construir estas rutas a mano (Transparent Derivation Principle): sólo
 * el cargador de servidor que alimenta `resolveMediaSource()`.
 */
export const DERIVED_PUBLIC_MEDIA_BUCKET = "media-derived";
export const DERIVED_PUBLIC_MEDIA_PREFIX = "/api/public/media-derived/";

export function toDerivedPublicMediaUrl(
  bucket: string | null | undefined,
  path: string | null | undefined,
): string | null {
  if (bucket !== DERIVED_PUBLIC_MEDIA_BUCKET) return null;
  const clean = (path ?? "").trim().replace(/^\/+/, "");
  if (!clean || clean.includes("..")) return null;
  return `${DERIVED_PUBLIC_MEDIA_PREFIX}${clean}`;
}
