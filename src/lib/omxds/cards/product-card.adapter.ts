import type { OmxdsCardVariant } from "./card-contract";
import { validateProductCardContract, type ProductCardContract } from "./product-card.contract";
export interface ProductCardSource {
  id: string;
  name: string;
  host: string;
  productType: string;
  unit: string;
  canonicalUrl: string;
  primaryDecision: "acquire" | "experience";
  variantName?: string | null;
  conditions?: readonly string[];
  delivery?: string | null;
  authorizedCommerce?: { price?: string | null; availability?: string | null } | null;
}
export function toProductCardContract(
  source: ProductCardSource,
  variant: OmxdsCardVariant = "standard",
): ProductCardContract | null {
  if (source.primaryDecision !== "acquire") return null;
  const contract: ProductCardContract = {
    family: "product",
    id: `product:${source.id}`,
    name: source.name,
    host: source.host,
    productType: source.productType,
    unit: source.unit,
    canonicalUrl: source.canonicalUrl,
    variantName: source.variantName ?? null,
    price: source.authorizedCommerce?.price ?? null,
    availability: source.authorizedCommerce?.availability ?? null,
    conditions: source.conditions ?? [],
    delivery: source.delivery ?? null,
    variant,
    state: "ready",
    actions: [
      { id: "save", label: "Guardar" },
      { id: "add_to_trip", label: "Agregar a mi viaje" },
      { id: "discover", label: "Ver producto", href: source.canonicalUrl },
    ],
  };
  return validateProductCardContract(contract).valid ? contract : null;
}
