import {
  createProductVerticalSurfaceContract,
  type ProductSurfaceContractInput,
  type ProductSurfaceProvenanceKind,
} from "./product-surface.contract";
import type { OmxdsSurfaceContract } from "./surface-contract";

const EXPERIENCE_PRODUCT_TYPES = new Set(["experiencia", "tour"]);

export function isExperienceSurfaceProductType(productType: string): boolean {
  return EXPERIENCE_PRODUCT_TYPES.has(productType.trim().toLowerCase());
}

export function adaptExperienceSurfaceContract(
  input: ProductSurfaceContractInput,
  provenanceKind: ProductSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (!isExperienceSurfaceProductType(input.productType)) return null;
  return createProductVerticalSurfaceContract(input, "experience", provenanceKind);
}
