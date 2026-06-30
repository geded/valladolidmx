/**
 * Context Registry (15.10.5b) — fuente única del contrato contextual
 * declarativo de cada workspace. El Workspace Engine consume sólo este
 * contrato; queda prohibido acoplar lógica contextual a componentes.
 */
import type {
  EntityDescriptor,
  InspectorViewDescriptor,
  QuickActionDescriptor,
  ViewDescriptor,
  WorkspaceContextDefinition,
} from "./types";
import { getWorkspace } from "./workspace-registry";

const overrides = new Map<string, WorkspaceContextDefinition>();

/** Registra/expande el contrato contextual de un workspace. */
export function registerWorkspaceContext(def: WorkspaceContextDefinition): void {
  overrides.set(def.workspaceId, def);
}

export function getWorkspaceContextDefinition(
  workspaceId: string,
): WorkspaceContextDefinition | undefined {
  return overrides.get(workspaceId) ?? getWorkspace(workspaceId)?.context;
}

export function listEntitiesFor(workspaceId: string): EntityDescriptor[] {
  return getWorkspaceContextDefinition(workspaceId)?.entities ?? [];
}

export function listQuickActionsFor(workspaceId: string): QuickActionDescriptor[] {
  return getWorkspaceContextDefinition(workspaceId)?.quickActions ?? [];
}

export function listInspectorsFor(workspaceId: string): InspectorViewDescriptor[] {
  return getWorkspaceContextDefinition(workspaceId)?.inspectors ?? [];
}

export function listViewsFor(workspaceId: string): ViewDescriptor[] {
  return getWorkspaceContextDefinition(workspaceId)?.views ?? [];
}

export function findInspectorFor(
  workspaceId: string,
  entityType: string,
): InspectorViewDescriptor | undefined {
  return listInspectorsFor(workspaceId).find((i) => i.entityType === entityType);
}