import type { OmxdsCardVariant } from "./card-contract";
import {
  validateExperienceCardContract,
  type ExperienceCardContract,
} from "./experience-card.contract";

export interface ExperienceCardSource {
  id: string;
  name: string;
  benefit: string;
  host: string;
  territory: string;
  modality: string;
  canonicalUrl: string;
  duration?: string | null;
  languages?: readonly string[];
  accessibility?: readonly string[];
  authorizedCommerce?: { price?: string | null; availability?: string | null } | null;
}

export function toExperienceCardContract(
  source: ExperienceCardSource,
  variant: OmxdsCardVariant = "standard",
): ExperienceCardContract | null {
  const contract: ExperienceCardContract = {
    family: "experience",
    id: `experience:${source.id}`,
    name: source.name,
    benefit: source.benefit,
    host: source.host,
    territory: source.territory,
    modality: source.modality,
    canonicalUrl: source.canonicalUrl,
    duration: source.duration ?? null,
    languages: source.languages ?? [],
    accessibility: source.accessibility ?? [],
    price: source.authorizedCommerce?.price ?? null,
    availability: source.authorizedCommerce?.availability ?? null,
    variant,
    state: "ready",
    actions: [
      { id: "save", label: "Guardar" },
      { id: "add_to_trip", label: "Agregar a mi viaje" },
      { id: "discover", label: "Ver experiencia", href: source.canonicalUrl },
    ],
  };
  return validateExperienceCardContract(contract).valid ? contract : null;
}
