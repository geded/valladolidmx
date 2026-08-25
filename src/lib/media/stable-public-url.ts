/**
 * 19.24 · V1-P1 · Stable Public Asset Contract Enforcement.
 *
 * Founder Stable Public Asset Contract: los metadatos indexables
 * (`og:image`, `image` de JSON-LD) SÓLO pueden apuntar a rutas públicas
 * estables. Una URL firmada de Storage caduca y jamás debe indexarse.
 *
 * Este módulo es la única fuente de verdad para decidir si una URL es
 * apta para metadatos indexables y para construir la ruta pública
 * estable canónica ya existente `/api/public/studio-media/<path>`.
 * No crea rutas nuevas ni mecanismos paralelos de medios.
 */

/** Bucket servido por el proxy público canónico. */
export const STABLE_PUBLIC_MEDIA_BUCKET = "studio-media";
/** Prefijo canónico ya existente (`src/routes/api/public/studio-media.$.ts`). */
export const STABLE_PUBLIC_MEDIA_PREFIX = "/api/public/studio-media/";

/** Marcadores objetivos de una URL firmada o temporal de Storage. */
const SIGNED_URL_MARKERS = ["/object/sign/", "token=", "X-Amz-Signature", "Expires="];

/**
 * Devuelve la ruta pública estable de un objeto del bucket gobernado,
 * o `null` si el objeto no vive en un bucket con ruta estable.
 */
export function toStablePublicMediaUrl(
  bucket: string | null | undefined,
  path: string | null | undefined,
): string | null {
  if (bucket !== STABLE_PUBLIC_MEDIA_BUCKET) return null;
  const clean = (path ?? "").trim().replace(/^\/+/, "");
  if (!clean || clean.includes("..")) return null;
  return `${STABLE_PUBLIC_MEDIA_PREFIX}${clean}`;
}

/** `true` si la URL contiene marcadores de firma temporal. */
export function isSignedMediaUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.trim() === "") return false;
  return SIGNED_URL_MARKERS.some((marker) => url.includes(marker));
}

/**
 * Filtro fail-closed para metadatos indexables: devuelve la URL sólo si
 * es estable. Ante cualquier duda (URL firmada o vacía) omite la imagen.
 */
export function stableIndexableImageUrl(
  url: string | null | undefined,
): string | undefined {
  if (typeof url !== "string") return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (isSignedMediaUrl(value)) return undefined;
  if (value.startsWith(STABLE_PUBLIC_MEDIA_PREFIX)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return undefined;
}
