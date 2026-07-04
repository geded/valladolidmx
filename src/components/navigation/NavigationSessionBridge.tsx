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
import { useResolvedContext } from "@/lib/context-engine";
import {
  snapshotFromContext,
  writeNavigationSession,
} from "@/lib/navigation/session-context";

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
