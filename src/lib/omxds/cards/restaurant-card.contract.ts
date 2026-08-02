import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";
import type { ContractValidation } from "./destination-card.contract";

export interface RestaurantCardContract {
  family: "restaurant";
  businessId: string;
  name: string;
  cuisine: string;
  zone: string;
  promise: string;
  canonicalUrl: string;
  priceRange: string | null;
  schedule: readonly string[];
  diets: readonly string[];
  reservation: string | null;
  reputation: { value: number; source: string; verifiedAt: string } | null;
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}
export function validateRestaurantCardContract(value: RestaurantCardContract): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "restaurant") errors.push("family must be restaurant");
  for (const [key, field] of [
    ["businessId", value.businessId],
    ["name", value.name],
    ["cuisine", value.cuisine],
    ["zone", value.zone],
    ["promise", value.promise],
  ] as const)
    if (!field.trim()) errors.push(`${key} is required`);
  if (!value.canonicalUrl.startsWith("/")) errors.push("canonicalUrl must be an internal route");
  if ("open_now" in value || "openNow" in value) errors.push("open_now is not authorized");
  if (value.actions.filter((action) => action.id === "discover").length !== 1)
    errors.push("exactly one discover action is required");
  return { valid: errors.length === 0, errors };
}
