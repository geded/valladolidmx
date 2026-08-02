import type { OmxdsCardVariant } from "./card-contract";
import { validateHotelCardContract, type HotelCardContract } from "./hotel-card.contract";

export interface HotelCardSource {
  businessId: string;
  name: string;
  hotelType: string;
  zone: string;
  promise: string;
  canonicalUrl: string;
  amenities?: readonly string[];
  accessibility?: readonly string[];
  authorizedCommerce?: { priceRange?: string | null; availability?: string | null } | null;
  verifiedReputation?: HotelCardContract["reputation"];
}
export function toHotelCardContract(
  source: HotelCardSource,
  variant: OmxdsCardVariant = "standard",
): HotelCardContract | null {
  const contract: HotelCardContract = {
    family: "hotel",
    businessId: source.businessId,
    name: source.name,
    hotelType: source.hotelType,
    zone: source.zone,
    promise: source.promise,
    canonicalUrl: source.canonicalUrl,
    priceRange: source.authorizedCommerce?.priceRange ?? null,
    availability: source.authorizedCommerce?.availability ?? null,
    amenities: source.amenities ?? [],
    accessibility: source.accessibility ?? [],
    reputation: source.verifiedReputation ?? null,
    variant,
    state: "ready",
    actions: [
      { id: "save", label: "Guardar" },
      { id: "add_to_trip", label: "Agregar a mi viaje" },
      { id: "discover", label: "Ver hospedaje", href: source.canonicalUrl },
    ],
  };
  return validateHotelCardContract(contract).valid ? contract : null;
}
