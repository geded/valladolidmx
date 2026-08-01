import type { OmxdsCardVariant } from "./card-contract";
import {
  validateEventCardContract,
  type EventCardContract,
  type EventTemporalState,
} from "./event-card.contract";
export interface EventCardSource {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  temporalState: EventTemporalState;
  venue: string;
  organizer: string;
  canonicalUrl: string;
  eventType?: string | null;
  access?: string | null;
  languages?: readonly string[];
}
export function toEventCardContract(
  source: EventCardSource,
  variant: OmxdsCardVariant = "standard",
): EventCardContract | null {
  const actions: EventCardContract["actions"] =
    source.temporalState === "scheduled"
      ? [
          { id: "save", label: "Guardar" },
          { id: "add_to_trip", label: "Agregar a mi viaje" },
          { id: "discover", label: "Ver evento", href: source.canonicalUrl },
        ]
      : [
          { id: "save", label: "Guardar" },
          { id: "discover", label: "Ver información", href: source.canonicalUrl },
        ];
  const contract: EventCardContract = {
    family: "event",
    id: `event:${source.id}`,
    title: source.title,
    startsAt: source.startsAt,
    endsAt: source.endsAt ?? null,
    temporalState: source.temporalState,
    venue: source.venue,
    organizer: source.organizer,
    canonicalUrl: source.canonicalUrl,
    eventType: source.eventType ?? null,
    access: source.access ?? null,
    languages: source.languages ?? [],
    variant,
    state: source.temporalState === "scheduled" ? "ready" : "partial_error",
    actions,
  };
  return validateEventCardContract(contract).valid ? contract : null;
}
