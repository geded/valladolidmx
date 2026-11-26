/**
 * Fotos firmadas bajo el dominio propio: convierte un enlace firmado del
 * almacenamiento en `/api/public/signed/<bucket>/<path>?token=…`. El servidor
 * reenvía el mismo token al almacenamiento, que sigue validándolo; no se
 * concede ningún acceso nuevo y el navegador nunca ve el host externo.
 * Sólo aplica a imágenes; documentos (PDF, etc.) conservan su enlace.
 */
const IMAGE_EXT = /\.(avif|webp|jpe?g|png|gif)$/i;
const SIGN_MARKER = "/storage/v1/object/sign/";
export const OWN_SIGNED_PREFIX = "/api/public/signed/";

export function toOwnDomainSignedUrl(url: string): string {
  if (typeof url !== "string") return url;
  const at = url.indexOf(SIGN_MARKER);
  if (at < 0 || !/^https:\/\/[a-z0-9]+\.supabase\.co/i.test(url)) return url;
  const rest = url.slice(at + SIGN_MARKER.length);
  const path = rest.split("?")[0] ?? "";
  if (!IMAGE_EXT.test(path)) return url;
  return `${OWN_SIGNED_PREFIX}${rest}`;
}
