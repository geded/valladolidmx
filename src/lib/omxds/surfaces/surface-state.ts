import { OMXDS_CARD_STATES, type OmxdsCardState } from "../cards/card-states";

export const OMXDS_SURFACE_STATES = OMXDS_CARD_STATES;

export type OmxdsSurfaceState = OmxdsCardState;

export function isOmxdsSurfaceState(value: unknown): value is OmxdsSurfaceState {
  return typeof value === "string" && OMXDS_SURFACE_STATES.includes(value as OmxdsSurfaceState);
}
