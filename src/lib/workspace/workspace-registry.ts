/**
 * Workspace Registry — única fuente de workspaces registrados.
 * El núcleo del Workspace Engine SOLO conoce workspaces por aquí.
 */
import type { WorkspaceDefinition } from "./types";

const registry = new Map<string, WorkspaceDefinition>();
const listeners = new Set<() => void>();

export function registerWorkspace(def: WorkspaceDefinition): void {
  registry.set(def.id, def);
  listeners.forEach((l) => l());
}

export function unregisterWorkspace(id: string): void {
  registry.delete(id);
  listeners.forEach((l) => l());
}

export function getWorkspace(id: string): WorkspaceDefinition | undefined {
  return registry.get(id);
}

export function listWorkspaces(): WorkspaceDefinition[] {
  return Array.from(registry.values());
}

/** Subscripción para hooks que necesiten reactividad ante registros. */
export function subscribeWorkspaces(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Resuelve el workspace activo a partir del pathname actual. */
export function resolveWorkspaceByPath(pathname: string): WorkspaceDefinition | undefined {
  let best: WorkspaceDefinition | undefined;
  let bestLen = -1;
  for (const ws of registry.values()) {
    if (pathname === ws.rootPath || pathname.startsWith(ws.rootPath + "/")) {
      if (ws.rootPath.length > bestLen) {
        best = ws;
        bestLen = ws.rootPath.length;
      }
    }
  }
  return best;
}