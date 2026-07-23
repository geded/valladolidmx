import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";

export interface DestinationCardContract {
  family: "destination";
  id: string;
  name: string;
  territorialType: string;
  identityPromise: string;
  parentTerritory: string;
  canonicalUrl: string;
  media: { url: string; alt: string; focalPoint: string } | null;
  reasons: readonly string[];
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}

export interface ContractValidation {
  valid: boolean;
  errors: string[];
}

export function validateDestinationCardContract(
  value: DestinationCardContract,
): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "destination") errors.push("family must be destination");
  if (!value.id.trim()) errors.push("id is required");
  if (!value.name.trim()) errors.push("name is required");
  if (!value.territorialType.trim()) errors.push("territorialType is required");
  if (!value.identityPromise.trim()) errors.push("identityPromise is required");
  if (value.identityPromise.length > 140) errors.push("identityPromise exceeds 140 characters");
  if (!value.parentTerritory.trim()) errors.push("parentTerritory is required");
  if (!value.canonicalUrl.startsWith("/")) errors.push("canonicalUrl must be an internal route");
  if (value.reasons.length > 3) errors.push("reasons accepts at most three items");
  const dominant = value.actions.filter((action) => action.id === "discover");
  if (dominant.length !== 1) errors.push("exactly one discover action is required");
  if (new Set(value.actions.map((action) => action.id)).size !== value.actions.length) {
    errors.push("actions must be independent and unique");
  }
  if (value.media && (!value.media.alt.trim() || !value.media.focalPoint.trim())) {
    errors.push("media requires accurate alt and focal point");
  }
  return { valid: errors.length === 0, errors };
}
