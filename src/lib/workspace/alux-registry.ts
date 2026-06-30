/**
 * Alux Copilot Layer — Registry transversal del Workspace Engine.
 *
 * Cada workspace puede declarar:
 *  - alux:            contexto/narrativa para el panel Copiloto.
 *  - aluxCapabilities: capacidades de lectura/acción expuestas a Alux.
 *
 * El panel Copiloto consume EXCLUSIVAMENTE este registry.
 * No referencia ningún workspace concreto.
 */
import type { AluxAction, AluxCapability, AluxContext } from "./types";
import { getWorkspace } from "./workspace-registry";

export function getAluxContext(workspaceId: string): AluxContext | undefined {
  return getWorkspace(workspaceId)?.alux;
}

export function getAluxCapabilities(workspaceId: string): AluxCapability[] {
  return getWorkspace(workspaceId)?.aluxCapabilities ?? [];
}

export async function resolveAluxHeadline(ctx: AluxContext): Promise<string> {
  const h = typeof ctx.headline === "function" ? ctx.headline() : ctx.headline;
  return await Promise.resolve(h);
}

export async function resolveAluxSummary(ctx: AluxContext): Promise<string | undefined> {
  if (!ctx.summary) return undefined;
  const s = typeof ctx.summary === "function" ? ctx.summary() : ctx.summary;
  return await Promise.resolve(s);
}

export async function resolveAluxActions(ctx: AluxContext): Promise<AluxAction[]> {
  if (!ctx.suggestedActions) return [];
  return await Promise.resolve(ctx.suggestedActions());
}