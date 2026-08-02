import {
  createOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
  type OmxdsSurfaceFamily,
  type OmxdsSurfaceOmission,
} from "./surface-contract";

export interface ProductSurfaceContractInput {
  id: string;
  slug: string;
  name: string;
  productType: string;
  businessName: string;
  canonicalUrl: string;
  hasMedia: boolean;
  hasCollection: boolean;
  verifiedBusiness: boolean;
}

export type ProductSurfaceProvenanceKind = "fixture" | "governed_source";

export function createProductVerticalSurfaceContract(
  input: ProductSurfaceContractInput,
  family: Extract<OmxdsSurfaceFamily, "product" | "experience">,
  provenanceKind: ProductSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (
    ![input.id, input.slug, input.name, input.productType, input.businessName].every(
      (value) => value.trim().length > 0,
    ) ||
    !input.canonicalUrl.startsWith("/") ||
    input.canonicalUrl.startsWith("//")
  )
    return null;

  const omissions: OmxdsSurfaceOmission[] = [
    "map",
    "offer",
    "price",
    "availability",
    "reservation",
    "delivery",
  ];
  if (!input.hasMedia) omissions.push("media");
  if (!input.hasCollection) omissions.push("collection");
  if (!input.verifiedBusiness) omissions.push("trust");

  return createOmxdsSurfaceContract({
    contractVersion: "i3-0",
    entityId: `product:${input.id}`,
    family,
    title: input.name,
    state: input.hasMedia ? "ready" : "no_media",
    provenance: {
      kind: provenanceKind,
      reference:
        provenanceKind === "fixture"
          ? `fixture:fictional:i3-c:${input.slug}`
          : `product:${input.id}`,
    },
    actions: [
      {
        id: "add_to_trip",
        label: `Agregar ${input.name} a mi viaje`,
        role: "dominant",
        href: input.canonicalUrl,
      },
    ],
    omissions,
  });
}

export function createProductSurfaceContract(
  input: ProductSurfaceContractInput,
  provenanceKind: ProductSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  return createProductVerticalSurfaceContract(input, "product", provenanceKind);
}
