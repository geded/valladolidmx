import {
  createBusinessVerticalSurfaceContract,
  type BusinessSurfaceContractInput,
  type BusinessSurfaceProvenanceKind,
} from "./business-surface.contract";
import type { OmxdsSurfaceContract } from "./surface-contract";

const RESTAURANT_CATEGORY_SLUGS = new Set([
  "restaurant",
  "restaurants",
  "restaurante",
  "restaurantes",
  "cafeteria",
  "cafeterias",
]);

export function isRestaurantSurfaceCategory(categorySlug: string): boolean {
  return RESTAURANT_CATEGORY_SLUGS.has(categorySlug.trim().toLowerCase());
}

export function adaptRestaurantSurfaceContract(
  input: BusinessSurfaceContractInput,
  provenanceKind: BusinessSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (!isRestaurantSurfaceCategory(input.categorySlug)) return null;
  return createBusinessVerticalSurfaceContract(input, "restaurant", provenanceKind);
}
