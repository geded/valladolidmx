import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";
import type { ContractValidation } from "./destination-card.contract";
export type EventTemporalState = "scheduled" | "sold_out" | "cancelled" | "finished";
export interface EventCardContract {
  family: "event";
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  temporalState: EventTemporalState;
  venue: string;
  organizer: string;
  canonicalUrl: string;
  eventType: string | null;
  access: string | null;
  languages: readonly string[];
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}
export function validateEventCardContract(value: EventCardContract): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "event") errors.push("family must be event");
  for (const [key, field] of [
    ["id", value.id],
    ["title", value.title],
    ["startsAt", value.startsAt],
    ["venue", value.venue],
    ["organizer", value.organizer],
  ] as const)
    if (!field.trim()) errors.push(`${key} is required`);
  if (!/([zZ]|[+-]\d\d:\d\d)$/.test(value.startsAt))
    errors.push("startsAt must include an explicit timezone");
  if (!value.canonicalUrl.startsWith("/")) errors.push("canonicalUrl must be an internal route");
  if (value.actions.filter((action) => action.id === "discover").length !== 1)
    errors.push("exactly one discover action is required");
  if (
    value.temporalState !== "scheduled" &&
    value.actions.some((action) => action.id === "add_to_trip")
  )
    errors.push("inactive events cannot be added to trip");
  return { valid: errors.length === 0, errors };
}
