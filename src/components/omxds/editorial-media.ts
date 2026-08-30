/**
 * G8-R1-F1L · Contrato de medio editorial acreditado.
 *
 * Vive fuera del módulo de componente para no mezclar exportaciones de
 * componentes con utilidades (react-refresh) y para poder consumirse desde
 * resolutores y servidores sin arrastrar JSX.
 */
export interface EditorialMedia {
  url: string;
  alt: string;
}

/** `true` cuando existe un medio acreditado renderizable. */
export function hasEditorialMedia(media?: EditorialMedia | null): boolean {
  return typeof media?.url === "string" && media.url.trim().length > 0;
}
