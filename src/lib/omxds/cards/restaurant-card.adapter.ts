import type { OmxdsCardVariant } from "./card-contract";
import {
  validateRestaurantCardContract,
  type RestaurantCardContract,
} from "./restaurant-card.contract";

export interface RestaurantCardSource {
  businessId: string;
  name: string;
  cuisine: string;
  zone: string;
  promise: string;
  canonicalUrl: string;
  schedule?: readonly string[];
  diets?: readonly string[];
  authorizedCommerce?: { priceRange?: string | null; reservation?: string | null } | null;
  verifiedReputation?: RestaurantCardContract["reputation"];
}
export function toRestaurantCardContract(
  source: RestaurantCardSource,
  variant: OmxdsCardVariant = "standard",
): RestaurantCardContract | null {
  const contract: RestaurantCardContract = {
    family: "restaurant",
    businessId: source.businessId,
    name: source.name,
    cuisine: source.cuisine,
    zone: source.zone,
    promise: source.promise,
    canonicalUrl: source.canonicalUrl,
    priceRange: source.authorizedCommerce?.priceRange ?? null,
    schedule: source.schedule ?? [],
    diets: source.diets ?? [],
    reservation: source.authorizedCommerce?.reservation ?? null,
    reputation: source.verifiedReputation ?? null,
    variant,
    state: "ready",
    actions: [
      { id: "save", label: "Guardar" },
      { id: "add_to_trip", label: "Agregar a mi viaje" },
      { id: "discover", label: "Ver restaurante", href: source.canonicalUrl },
    ],
  };
  return validateRestaurantCardContract(contract).valid ? contract : null;
}
