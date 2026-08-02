import {
  createOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
  type OmxdsSurfaceFamily,
  type OmxdsSurfaceOmission,
} from "./surface-contract";

export interface BusinessSurfaceContractInput {
  id: string;
  slug: string;
  displayName: string;
  destinationSlug: string;
  categorySlug: string;
  coverUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  relatedCount: number;
}

export type BusinessSurfaceProvenanceKind = "fixture" | "governed_source";

function canonicalBusinessHref(input: BusinessSurfaceContractInput): string {
  return `/oriente-maya/${encodeURIComponent(input.destinationSlug)}/${encodeURIComponent(input.categorySlug)}/${encodeURIComponent(input.slug)}#contacto`;
}

export function createBusinessVerticalSurfaceContract(
  input: BusinessSurfaceContractInput,
  family: Extract<OmxdsSurfaceFamily, "business" | "hotel" | "restaurant">,
  provenanceKind: BusinessSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (
    ![input.id, input.slug, input.displayName, input.destinationSlug, input.categorySlug].every(
      (value) => value.trim().length > 0,
    ) ||
    !Number.isInteger(input.relatedCount) ||
    input.relatedCount < 0
  )
    return null;

  const omissions: OmxdsSurfaceOmission[] = [
    "offer",
    "price",
    "availability",
    "reservation",
    "reputation",
  ];

  if (!input.coverUrl) omissions.push("media");
  if (input.latitude === null || input.longitude === null) omissions.push("map");
  if (input.relatedCount === 0) omissions.push("collection");
  if (!input.verified) omissions.push("trust");

  return createOmxdsSurfaceContract({
    contractVersion: "i3-0",
    entityId: `business:${input.id}`,
    family,
    title: input.displayName,
    state: input.coverUrl ? "ready" : "no_media",
    provenance: {
      kind: provenanceKind,
      reference:
        provenanceKind === "fixture"
          ? `fixture:fictional:i3-b:${input.slug}`
          : `business:${input.id}`,
    },
    actions: [
      {
        id: "contact",
        label: `Contactar a ${input.displayName}`,
        role: "dominant",
        href: canonicalBusinessHref(input),
      },
    ],
    omissions,
  });
}

export function createBusinessSurfaceContract(
  input: BusinessSurfaceContractInput,
  provenanceKind: BusinessSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  return createBusinessVerticalSurfaceContract(input, "business", provenanceKind);
}
