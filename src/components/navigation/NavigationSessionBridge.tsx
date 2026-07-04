/**
 * NavigationSessionBridge — Sincronización Context Engine ↔ sessionStorage
 * (Navigation Blueprint v1.0 · Sub-ola N3).
 *
 * Se monta implícitamente dentro de `PublicShell` cuando existe un
 * `ContextEngineProvider`, y persiste la cadena territorial resuelta
 * para habilitar continuidad al:
 *  · abrir deep-links en pestaña nueva,
 *  · refrescar el navegador,
 *  · navegar back/forward.
 *
 * No renderiza nada. No compone rutas. No ejecuta side-effects fuera
 * de `sessionStorage`. Toda la política vive en `session-context.ts`.
 */
import { useEffect } from "react";
import {
  subscribeResolvedContext,
  useResolvedContext,
} from "@/lib/context-engine";
import {
  snapshotFromContext,
  writeNavigationSession,
} from "@/lib/navigation/session-context";

/**
 * Modo local: cuando se monta dentro de un `ContextEngineProvider`
 * concreto, sincroniza usando su `useResolvedContext()`. Se conserva
 * para retrocompatibilidad y para tests unitarios.
 */
export function NavigationSessionBridge() {
  const ctx = useResolvedContext();
  useEffect(() => {
    if (!ctx) return;
    const snapshot = snapshotFromContext(ctx);
    if (!snapshot) return;
    writeNavigationSession(snapshot);
  }, [ctx]);
  return null;
}

/**
 * Modo global: se monta UNA vez en `__root.tsx` y escucha el pub/sub
 * `live-context`. Reacciona a cualquier `ContextEngineProvider` del
 * árbol sin importar dónde viva (rutas territoriales, PublicShell,
 * playgrounds). Recomendado como punto de montaje canónico N3.
 */
export function GlobalNavigationSessionBridge() {
  useEffect(() => {
    return subscribeResolvedContext((ctx) => {
      if (!ctx) return;
      const snapshot = snapshotFromContext(ctx);
      if (!snapshot) return;
      writeNavigationSession(snapshot);
    });
  }, []);
  return null;
}
