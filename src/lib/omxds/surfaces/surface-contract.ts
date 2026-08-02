import {
  hasSingleDominantSurfaceAction,
  isOmxdsSurfaceAction,
  type OmxdsSurfaceAction,
} from "./surface-actions";
import { isOmxdsSurfaceState, type OmxdsSurfaceState } from "./surface-state";

export const OMXDS_SURFACE_FAMILIES = [
  "destination",
  "business",
  "experience",
  "hotel",
  "restaurant",
  "event",
  "product",
] as const;

export const OMXDS_SURFACE_OMISSIONS = [
  "media",
  "map",
  "collection",
  "trust",
  "offer",
  "price",
  "availability",
  "policies",
  "schedule",
  "reservation",
  "reputation",
  "access",
  "delivery",
] as const;

export type OmxdsSurfaceFamily = (typeof OMXDS_SURFACE_FAMILIES)[number];
export type OmxdsSurfaceOmission = (typeof OMXDS_SURFACE_OMISSIONS)[number];

export interface OmxdsSurfaceProvenance {
  kind: "fixture" | "governed_source";
  reference: string;
}

export interface OmxdsSurfaceContract {
  contractVersion: "i3-0";
  entityId: string;
  family: OmxdsSurfaceFamily;
  title: string;
  state: OmxdsSurfaceState;
  provenance: OmxdsSurfaceProvenance;
  actions: readonly OmxdsSurfaceAction[];
  omissions: readonly OmxdsSurfaceOmission[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isOmxdsSurfaceFamily(value: unknown): value is OmxdsSurfaceFamily {
  return typeof value === "string" && OMXDS_SURFACE_FAMILIES.includes(value as OmxdsSurfaceFamily);
}

export function isOmxdsSurfaceContract(value: unknown): value is OmxdsSurfaceContract {
  if (!isRecord(value) || value.contractVersion !== "i3-0") return false;
  if (!isNonEmptyString(value.entityId) || !isNonEmptyString(value.title)) return false;
  if (!isOmxdsSurfaceFamily(value.family) || !isOmxdsSurfaceState(value.state)) return false;
  if (!isRecord(value.provenance)) return false;
  if (!["fixture", "governed_source"].includes(String(value.provenance.kind))) return false;
  if (!isNonEmptyString(value.provenance.reference)) return false;
  if (!Array.isArray(value.actions) || !value.actions.every(isOmxdsSurfaceAction)) return false;
  if (!hasSingleDominantSurfaceAction(value.actions)) return false;
  if (
    value.state === "ready" &&
    value.actions.filter((action) => action.role === "dominant").length !== 1
  )
    return false;
  if (!Array.isArray(value.omissions)) return false;
  return value.omissions.every(
    (omission) =>
      typeof omission === "string" &&
      OMXDS_SURFACE_OMISSIONS.includes(omission as OmxdsSurfaceOmission),
  );
}

export function createOmxdsSurfaceContract(value: unknown): OmxdsSurfaceContract | null {
  return isOmxdsSurfaceContract(value) ? value : null;
}
