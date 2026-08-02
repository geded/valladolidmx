import type { OmxdsCardState } from "./card-states";
import type { CardActionContract, OmxdsCardVariant } from "./card-contract";
import type { ContractValidation } from "./destination-card.contract";

export interface ExperienceCardContract {
  family: "experience";
  id: string;
  name: string;
  benefit: string;
  host: string;
  territory: string;
  modality: string;
  canonicalUrl: string;
  duration: string | null;
  languages: readonly string[];
  accessibility: readonly string[];
  price: string | null;
  availability: string | null;
  variant: OmxdsCardVariant;
  state: OmxdsCardState;
  actions: readonly CardActionContract[];
}

export function validateExperienceCardContract(value: ExperienceCardContract): ContractValidation {
  const errors: string[] = [];
  if (value.family !== "experience") errors.push("family must be experience");
  for (const [key, field] of [
    ["id", value.id],
    ["name", value.name],
    ["benefit", value.benefit],
    ["host", value.host],
    ["territory", value.territory],
    ["modality", value.modality],
  ] as const) {
    if (!field.trim()) errors.push(`${key} is required`);
  }
  if (!value.canonicalUrl.startsWith("/")) errors.push("canonicalUrl must be an internal route");
  if (value.actions.filter((action) => action.id === "discover").length !== 1)
    errors.push("exactly one discover action is required");
  if (new Set(value.actions.map((action) => action.id)).size !== value.actions.length)
    errors.push("actions must be independent and unique");
  return { valid: errors.length === 0, errors };
}
