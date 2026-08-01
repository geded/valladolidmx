import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";
import type { ContractValidation } from "./destination-card.contract";
export interface ProductCardContract {
  family: "product";
  id: string;
  name: string;
  host: string;
  productType: string;
  unit: string;
  canonicalUrl: string;
  variantName: string | null;
  price: string | null;
  availability: string | null;
  conditions: readonly string[];
  delivery: string | null;
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}
export function validateProductCardContract(value: ProductCardContract): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "product") errors.push("family must be product");
  for (const [key, field] of [
    ["id", value.id],
    ["name", value.name],
    ["host", value.host],
    ["productType", value.productType],
    ["unit", value.unit],
  ] as const)
    if (!field.trim()) errors.push(`${key} is required`);
  if (!value.canonicalUrl.startsWith("/")) errors.push("canonicalUrl must be an internal route");
  if (value.actions.filter((action) => action.id === "discover").length !== 1)
    errors.push("exactly one discover action is required");
  return { valid: errors.length === 0, errors };
}
