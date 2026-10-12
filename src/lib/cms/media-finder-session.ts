/**
 * Conserva el trabajo del buscador/creador de imágenes de Alux mientras el
 * editor sale a otra app o pestaña a buscar fotos (en iPad/iPhone el sistema
 * puede recargar la página al volver). Vive sólo en sessionStorage de la
 * pestaña; nunca sube nada ni publica.
 */
const PREFIX = "vmx.cms.media-finder.v1";

export function mediaFinderKey(hint: string): string {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return `${PREFIX}:${path}:${hint}`;
}

export function readMediaFinder<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeMediaFinder(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cuota llena (p. ej. imagen generada grande): se intenta sin la imagen.
    try {
      const v = { ...(value as Record<string, unknown>), genImage: null };
      window.sessionStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* sin persistencia */
    }
  }
}

export function clearMediaFinder(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
    window.sessionStorage.removeItem(`${key}:mode`);
  } catch {
    /* noop */
  }
}
