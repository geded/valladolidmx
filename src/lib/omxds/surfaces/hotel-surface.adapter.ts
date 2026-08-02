import {
  createBusinessVerticalSurfaceContract,
  type BusinessSurfaceContractInput,
  type BusinessSurfaceProvenanceKind,
} from "./business-surface.contract";
import type { OmxdsSurfaceContract } from "./surface-contract";

const HOTEL_CATEGORY_SLUGS = new Set(["hotel", "hoteles", "hospedaje", "hospedajes"]);

export function isHotelSurfaceCategory(categorySlug: string): boolean {
  return HOTEL_CATEGORY_SLUGS.has(categorySlug.trim().toLowerCase());
}

export function adaptHotelSurfaceContract(
  input: BusinessSurfaceContractInput,
  provenanceKind: BusinessSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (!isHotelSurfaceCategory(input.categorySlug)) return null;
  return createBusinessVerticalSurfaceContract(input, "hotel", provenanceKind);
}
