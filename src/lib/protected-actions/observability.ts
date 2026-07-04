/**
 * Observabilidad de Acciones Protegidas — v1.
 *
 * Sink por defecto: `console.debug` (sin PII). Diseñado para admitir un
 * pipeline real (Ola de Observabilidad) sin cambiar consumidores.
 * Cualquier módulo puede suscribirse con `subscribeProtectedActionEvents`.
 */
import type {
  ProtectedActionEvent,
  ProtectedActionEventMeta,
} from "./types";

type Listener = (event: ProtectedActionEvent, meta: ProtectedActionEventMeta) => void;

const listeners = new Set<Listener>();

export function subscribeProtectedActionEvents(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitProtectedActionEvent(
  event: ProtectedActionEvent,
  meta: ProtectedActionEventMeta,
): void {
  // Dedup ligero por (event, actionId) en una ventana muy corta para evitar
  // dobles emisiones desde React StrictMode. No es persistente.
  const key = `${event}::${meta.actionId}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 50) return;
  recent.set(key, now);
  if (recent.size > 200) recent.clear();

  if (typeof console !== "undefined" && typeof console.debug === "function") {
    // Sin PII: sólo actionId, kind, ttl, reason, errorCode.
    console.debug("[protected_action]", event, meta);
  }
  listeners.forEach((l) => {
    try {
      l(event, meta);
    } catch {
      /* nunca romper por un listener */
    }
  });
}

const recent = new Map<string, number>();
