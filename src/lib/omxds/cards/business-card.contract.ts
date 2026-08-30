import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";
import type { ContractValidation } from "./destination-card.contract";

export interface BusinessCardContract {
  family: "business";
  id: string;
  name: string;
  category: string | null;
  territory: string | null;
  summary: string | null;
  canonicalUrl: string;
  media: { url: string; alt: string; focalPoint: string } | null;
  rating: { value: number; source: string; verifiedAt: string } | null;
  badges: readonly string[];
  commercialState: string | null;
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}

export function validateBusinessCardContract(value: BusinessCardContract): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "business") errors.push("family must be business");
  if (!value.id.trim()) errors.push("id is required");
  if (!value.name.trim()) errors.push("name is required");
  if (!value.canonicalUrl.startsWith("/")) {
    errors.push("canonicalUrl must be an internal route");
  }
  if (value.summary && value.summary.length > 140) {
    errors.push("summary exceeds 140 characters");
  }
  const dominant = value.actions.filter((action) => action.id === "discover");
  if (dominant.length !== 1) errors.push("exactly one discover action is required");
  if (new Set(value.actions.map((action) => action.id)).size !== value.actions.length) {
    errors.push("actions must be independent and unique");
  }
  if (value.media && (!value.media.alt.trim() || !value.media.focalPoint.trim())) {
    errors.push("media requires accurate alt and focal point");
  }
  if (
    value.rating &&
    (!value.rating.source.trim() ||
      !value.rating.verifiedAt.trim() ||
      value.rating.value < 0 ||
      value.rating.value > 5)
  ) {
    errors.push("rating requires a traceable source, verification date and value from 0 to 5");
  }
  return { valid: errors.length === 0, errors };
}
