import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";
import type { ContractValidation } from "./destination-card.contract";

export interface HotelCardContract {
  family: "hotel";
  businessId: string;
  name: string;
  hotelType: string;
  zone: string;
  promise: string;
  canonicalUrl: string;
  priceRange: string | null;
  availability: string | null;
  amenities: readonly string[];
  accessibility: readonly string[];
  reputation: { value: number; source: string; verifiedAt: string } | null;
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}

export function validateHotelCardContract(value: HotelCardContract): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "hotel") errors.push("family must be hotel");
  for (const [key, field] of [
    ["businessId", value.businessId],
    ["name", value.name],
    ["hotelType", value.hotelType],
    ["zone", value.zone],
    ["promise", value.promise],
  ] as const)
    if (!field.trim()) errors.push(`${key} is required`);
  if (!value.canonicalUrl.startsWith("/")) errors.push("canonicalUrl must be an internal route");
  if (value.actions.filter((action) => action.id === "discover").length !== 1)
    errors.push("exactly one discover action is required");
  if (
    value.reputation &&
    (!value.reputation.source ||
      !value.reputation.verifiedAt ||
      value.reputation.value < 0 ||
      value.reputation.value > 5)
  )
    errors.push("reputation requires a traceable source, verification date and value from 0 to 5");
  return { valid: errors.length === 0, errors };
}
