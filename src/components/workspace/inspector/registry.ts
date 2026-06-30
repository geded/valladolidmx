/**
 * Inspector registry (15.10.5b) — fachada sobre Context Registry.
 * Permite registrar vistas en runtime sin tocar la definición estática.
 */
import type {
  EntityRef,
  InspectorViewDescriptor,
} from "@/lib/workspace/types";
import {
  findInspectorFor,
  listInspectorsFor,
} from "@/lib/workspace/context-registry";

const runtime = new Map<string, InspectorViewDescriptor[]>();

export function registerInspectorView(
  workspaceId: string,
  view: InspectorViewDescriptor,
) {
  const list = runtime.get(workspaceId) ?? [];
  list.push(view);
  runtime.set(workspaceId, list);
}

export function resolveInspector(
  workspaceId: string,
  entity: EntityRef,
): InspectorViewDescriptor | undefined {
  const runtimeMatch = runtime
    .get(workspaceId)
    ?.find((v) => v.entityType === entity.type);
  return runtimeMatch ?? findInspectorFor(workspaceId, entity.type);
}

export function listAllInspectors(
  workspaceId: string,
): InspectorViewDescriptor[] {
  return [...listInspectorsFor(workspaceId), ...(runtime.get(workspaceId) ?? [])];
}