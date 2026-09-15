/**
 * G8-R1-F1L · Contrato de medio editorial acreditado.
 *
 * Vive fuera del módulo de componente para no mezclar exportaciones de
 * componentes con utilidades (react-refresh) y para poder consumirse desde
 * resolutores y servidores sin arrastrar JSX.
 */
import type { MediaAssetInput } from "@/lib/media/resolve-source";

export interface EditorialMedia {
  url: string;
  alt: string;
  /** Identidad y variantes opcionales; una URL legacy sigue siendo suficiente. */
  asset?: MediaAssetInput | null;
}

/** `true` cuando existe un medio acreditado renderizable. */
export function hasEditorialMedia(media?: EditorialMedia | null): boolean {
  return typeof media?.url === "string" && media.url.trim().length > 0;
}
