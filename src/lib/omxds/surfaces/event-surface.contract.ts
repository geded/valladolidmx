import {
  createOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
  type OmxdsSurfaceOmission,
} from "./surface-contract";

export interface EventSurfaceContractInput {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  hasMedia: boolean;
  hasOrganizer: boolean;
}

export type EventSurfaceProvenanceKind = "fixture" | "governed_source";

export function createEventSurfaceContract(
  input: EventSurfaceContractInput,
  provenanceKind: EventSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (
    ![input.id, input.slug, input.title, input.startsAt].every(
      (value) => value.trim().length > 0,
    ) ||
    !/([zZ]|[+-]\d\d:\d\d)$/.test(input.startsAt)
  )
    return null;

  const omissions: OmxdsSurfaceOmission[] = [
    "map",
    "collection",
    "offer",
    "price",
    "availability",
    "reservation",
    "delivery",
  ];
  if (!input.hasMedia) omissions.push("media");
  if (!input.hasOrganizer) omissions.push("trust");

  return createOmxdsSurfaceContract({
    contractVersion: "i3-0",
    entityId: `event:${input.id}`,
    family: "event",
    title: input.title,
    state: input.hasMedia ? "ready" : "no_media",
    provenance: {
      kind: provenanceKind,
      reference:
        provenanceKind === "fixture" ? `fixture:fictional:i3-c:${input.slug}` : `event:${input.id}`,
    },
    actions: [
      {
        id: "add_to_trip",
        label: `Agregar ${input.title} a mi viaje`,
        role: "dominant",
        href: `/eventos/${encodeURIComponent(input.slug)}`,
      },
    ],
    omissions,
  });
}
