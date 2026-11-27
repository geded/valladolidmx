/**
 * photo-link-recovery.ts — Autorreparación de fotos con enlace vencido.
 *
 * Las fotos protegidas usan enlaces firmados que caducan. Si una página
 * guardada (app instalada, pestaña dormida, versión anterior) intenta
 * mostrar un enlace vencido, la foto falla. Aquí se detecta ese fallo y se
 * piden datos nuevos una sola vez (sin recargar ni perder la posición), de
 * modo que cada foto recibe un enlace vigente. No depende de que el Service
 * Worker ya se haya actualizado.
 */

const SIGNED_MARKERS = ["/api/public/signed/", "/storage/v1/object/sign/"];
export const PHOTO_RECOVERY_COOLDOWN_MS = 2 * 60_000;

export function isSignedPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return SIGNED_MARKERS.some((m) => url.includes(m));
}

/** Decide si un fallo de foto debe disparar una renovación de datos. */
export function shouldRecoverPhotos(opts: {
  url: string | null | undefined;
  online: boolean;
  now: number;
  lastRecoveryAt: number;
}): boolean {
  if (!opts.online || !isSignedPhotoUrl(opts.url)) return false;
  return opts.now - opts.lastRecoveryAt >= PHOTO_RECOVERY_COOLDOWN_MS;
}

/** Escucha fallos de fotos firmadas y llama `refresh` como máximo cada 2 min. */
export function installPhotoLinkRecovery(refresh: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  let lastRecoveryAt = 0;
  const onError = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    const url = target.currentSrc || target.src;
    const now = Date.now();
    if (!shouldRecoverPhotos({ url, online: navigator.onLine !== false, now, lastRecoveryAt })) return;
    lastRecoveryAt = now;
    refresh();
  };
  // Los errores de <img> no burbujean: se escuchan en fase de captura.
  window.addEventListener("error", onError, true);
  return () => window.removeEventListener("error", onError, true);
}
