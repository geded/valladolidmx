export const OMXDS_CARD_STATES = [
  "ready",
  "loading",
  "empty",
  "partial_error",
  "total_error",
  "offline",
  "no_media",
] as const;

export type OmxdsCardState = (typeof OMXDS_CARD_STATES)[number];

export function isOmxdsCardState(value: unknown): value is OmxdsCardState {
  return typeof value === "string" && OMXDS_CARD_STATES.includes(value as OmxdsCardState);
}
