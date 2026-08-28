import type { BusinessTeaser } from "@/types/entities";
import { resolveCanonicalPath } from "@/lib/navigation";
import type { OmxdsCardVariant } from "./card-contract";
import { validateBusinessCardContract, type BusinessCardContract } from "./business-card.contract";

export function resolveBusinessCanonicalUrl(business: BusinessTeaser): string {
  return business.destination_slug && business.category_slug
    ? resolveCanonicalPath({
        kind: "business",
        slug: business.slug,
        category: business.category_slug,
        destination: business.destination_slug,
      })
    : `/marketplace/${business.slug}`;
}

export function toBusinessCardContract(
  business: BusinessTeaser,
  variant: OmxdsCardVariant = "standard",
): BusinessCardContract | null {
  const canonicalUrl = resolveBusinessCanonicalUrl(business);
  const contract: BusinessCardContract = {
    family: "business",
    id: `business:${business.id}`,
    name: business.name,
    category: business.category_slug || null,
    territory: business.destination_slug || null,
    summary: business.tagline || null,
    canonicalUrl,
    media: null,
    rating: null,
    badges: [],
    commercialState: null,
    variant,
    state: "no_media",
    actions: [
      { id: "save", label: "Guardar" },
      { id: "add_to_trip", label: "Agregar a mi viaje" },
      { id: "discover", label: "Ver empresa", href: canonicalUrl },
    ],
  };
  return validateBusinessCardContract(contract).valid ? contract : null;
}
