/**
 * A13 · Floating Alux event bus.
 *
 * Micro bus DOM (CustomEvent) para abrir el concierge flotante desde
 * cualquier parte del árbol sin acoplar componentes ni introducir un
 * provider global. Usado por el banner proactivo territorial y por
 * cards que quieran invocar a Alux con contexto pre-cargado.
 */

export type AluxOpenReason =
  | "nearby-suggestion"
  | "context-chip"
  | "manual";

export interface AluxOpenPayload {
  reason: AluxOpenReason;
  hint?: string;
}

const EVENT = "alux:open";

export function openAluxFloating(payload: AluxOpenPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AluxOpenPayload>(EVENT, { detail: payload }));
}

export function onAluxFloatingOpen(
  handler: (payload: AluxOpenPayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (ev: Event) => {
    const detail = (ev as CustomEvent<AluxOpenPayload>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}