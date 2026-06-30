/**
 * Navigation Registry — única fuente para Sidebar, Bottom-Nav,
 * Command Palette y Workspace Switcher.
 *
 * Está PROHIBIDO hardcodear menús dentro del Workspace Engine.
 * Toda contribución pasa por aquí (directamente o vía
 * WorkspaceDefinition.navigation).
 */
import type { NavItem, NavSurface } from "./types";
import { listWorkspaces, subscribeWorkspaces } from "./workspace-registry";

const extra = new Map<string, NavItem>();
const listeners = new Set<() => void>();

// Re-emit cuando cambien workspaces.
subscribeWorkspaces(() => listeners.forEach((l) => l()));

export function contributeNavItem(item: NavItem): void {
  extra.set(item.id, item);
  listeners.forEach((l) => l());
}

export function removeNavItem(id: string): void {
  extra.delete(id);
  listeners.forEach((l) => l());
}

export function subscribeNavigation(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function surfacesOf(item: NavItem): NavSurface[] {
  return item.surfaces ?? ["sidebar", "palette"];
}

export function getNavItemsForWorkspace(
  workspaceId: string,
  surface: NavSurface,
): NavItem[] {
  const fromDef =
    listWorkspaces().find((w) => w.id === workspaceId)?.navigation ?? [];
  const all = [...fromDef, ...extra.values()].filter(
    (i) => i.workspaceId === workspaceId && surfacesOf(i).includes(surface),
  );
  return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Items por grupo para sidebar (preserva orden). */
export function groupNavItems(items: NavItem[]): Record<string, NavItem[]> {
  const out: Record<string, NavItem[]> = {};
  for (const it of items) {
    const g = it.group ?? "general";
    (out[g] ??= []).push(it);
  }
  return out;
}