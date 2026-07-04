/**
 * Sheet Controller — store mínimo (subscribe) para la gate activa.
 * (OLA H-01 · Épica 1 · I2)
 *
 * Se mantiene desacoplado de React para permitir invocación desde el hook
 * sin dependencias circulares. El componente `SignInPromptSheet` (host
 * global montado en `__root.tsx`) suscribe y renderiza el `BottomSheet`.
 *
 * Decisión de diseño: NO se envuelve la aplicación en `SheetStackProvider`
 * (hoy sólo montado dentro de `WorkspaceShell`). En su lugar se reutiliza
 * el mismo primitivo `BottomSheet` — mismo componente vaul, mismos snaps,
 * mismos tokens — bajo un host dedicado. Esto respeta Interaction
 * Consistency Policy sin tocar el árbol de providers ni duplicar sheets
 * cuando ya hay Workspace activo.
 */
import type { PendingActionRecord } from "./types";

export interface GateCopy {
  title?: string;
  description?: string;
  primaryCta?: string;
  dismissCta?: string;
}

export interface ActiveGate {
  record: PendingActionRecord;
  copy: GateCopy;
}

type Listener = (gate: ActiveGate | null) => void;

let active: ActiveGate | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((l) => {
    try {
      l(active);
    } catch {
      /* nunca romper por listener */
    }
  });
}

export const SheetController = {
  open(gate: ActiveGate): void {
    active = gate;
    notify();
  },
  close(): void {
    active = null;
    notify();
  },
  current(): ActiveGate | null {
    return active;
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
