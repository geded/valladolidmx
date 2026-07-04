/**
 * Context Engine — Bus de eventos ligero (H-02 · I1).
 *
 * Emisor SSR-safe. No usa ninguna API global de navegador salvo cuando
 * corre en cliente. Sin dependencias externas.
 */
import type {
  ContextEngineEvent,
  ContextEngineEventListener,
  ContextEngineEventMeta,
} from "./types";

const listeners = new Set<ContextEngineEventListener>();

export function subscribeContextEngineEvents(
  listener: ContextEngineEventListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitContextEngineEvent(
  event: ContextEngineEvent,
  meta: Omit<ContextEngineEventMeta, "at"> & { at?: number },
): void {
  const payload: ContextEngineEventMeta = { ...meta, at: meta.at ?? Date.now() };
  for (const l of listeners) {
    try {
      l(event, payload);
    } catch {
      // never break emitter chain
    }
  }
}