/**
 * Live Context Broadcast — Fuente de suscripción para consumidores
 * globales del contexto resuelto (H-02 · N3).
 *
 * Motivación: `ContextEngineProvider` puede vivir en múltiples puntos
 * del árbol (una ruta, `PublicShell`, playgrounds). Consumidores
 * globales como el `NavigationSessionBridge` necesitan reaccionar al
 * último contexto resuelto sin colocarse dentro de cada provider.
 *
 * Este módulo es un pub/sub in-memory, SSR-safe (no toca window). El
 * provider publica cada vez que cambia el `canonical`; los suscriptores
 * reciben el `ResolvedContext` completo. Cero acoplamiento estructural.
 */
import type { ResolvedContext } from "./types";

type Listener = (ctx: ResolvedContext | null) => void;

let latest: ResolvedContext | null = null;
const listeners = new Set<Listener>();

export function publishResolvedContext(ctx: ResolvedContext | null): void {
  latest = ctx;
  for (const listener of listeners) {
    try {
      listener(ctx);
    } catch {
      // suscriptor defectuoso no debe romper la cadena
    }
  }
}

export function getLatestResolvedContext(): ResolvedContext | null {
  return latest;
}

export function subscribeResolvedContext(listener: Listener): () => void {
  listeners.add(listener);
  if (latest) {
    try {
      listener(latest);
    } catch {
      // idem
    }
  }
  return () => {
    listeners.delete(listener);
  };
}
