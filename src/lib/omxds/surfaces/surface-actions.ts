export const OMXDS_SURFACE_ACTION_IDS = [
  "discover",
  "continue",
  "view",
  "contact",
  "add_to_trip",
  "view_menu",
  "retry",
] as const;

export const OMXDS_SURFACE_ACTION_ROLES = ["dominant", "utility", "recovery"] as const;

export type OmxdsSurfaceActionId = (typeof OMXDS_SURFACE_ACTION_IDS)[number];
export type OmxdsSurfaceActionRole = (typeof OMXDS_SURFACE_ACTION_ROLES)[number];

export interface OmxdsSurfaceAction {
  id: OmxdsSurfaceActionId;
  label: string;
  role: OmxdsSurfaceActionRole;
  href?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSafeSurfaceHref(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function isOmxdsSurfaceAction(value: unknown): value is OmxdsSurfaceAction {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    !OMXDS_SURFACE_ACTION_IDS.includes(value.id as OmxdsSurfaceActionId)
  )
    return false;
  if (typeof value.label !== "string" || value.label.trim().length === 0) return false;
  if (
    typeof value.role !== "string" ||
    !OMXDS_SURFACE_ACTION_ROLES.includes(value.role as OmxdsSurfaceActionRole)
  )
    return false;
  if (value.href !== undefined && !isSafeSurfaceHref(value.href)) return false;
  return value.id === "retry" || isSafeSurfaceHref(value.href);
}

export function hasSingleDominantSurfaceAction(actions: readonly OmxdsSurfaceAction[]): boolean {
  return actions.filter((action) => action.role === "dominant").length <= 1;
}
