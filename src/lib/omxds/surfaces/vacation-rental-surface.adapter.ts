/**
 * G8-P2 · Adaptador semántico de la familia Casa de vacaciones.
 *
 * Reutiliza las primitivas premium y la composición general de Hotel,
 * pero declara su propio contrato semántico: propiedad completa,
 * capacidad, dormitorios, camas, baños, amenidades, cocina, alberca,
 * estancia mínima, check-in/check-out, reglas, disponibilidad, precio
 * por noche y ubicación aproximada cuando la privacidad lo exige.
 * JSON-LD canónico: `VacationRental`.
 *
 * Nota de familia: el contrato de superficie se emite como `business`
 * (no `hotel`) para no confundir semánticamente la propiedad completa
 * con un establecimiento hotelero.
 */
import {
  createBusinessVerticalSurfaceContract,
  type BusinessSurfaceContractInput,
  type BusinessSurfaceProvenanceKind,
} from "./business-surface.contract";
import type { OmxdsSurfaceContract } from "./surface-contract";

const VACATION_RENTAL_CATEGORY_SLUGS = new Set([
  "casa-de-vacaciones",
  "casas-de-vacaciones",
  "vacation-rental",
  "vacation-rentals",
  "renta-vacacional",
  "rentas-vacacionales",
]);

export const VACATION_RENTAL_JSON_LD_TYPE = "VacationRental" as const;

export interface VacationRentalSemantics {
  wholeProperty: boolean;
  capacity: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: readonly string[];
  kitchen: boolean;
  pool: boolean;
  minimumStayNights: number | null;
  checkIn: string | null;
  checkOut: string | null;
  houseRules: readonly string[];
  availabilityNote: string | null;
  nightlyPrice: number | null;
  /** Ubicación aproximada por privacidad (sin dirección exacta). */
  approximateLocation: boolean;
}

export function isVacationRentalSurfaceCategory(categorySlug: string): boolean {
  return VACATION_RENTAL_CATEGORY_SLUGS.has(categorySlug.trim().toLowerCase());
}

export function adaptVacationRentalSurfaceContract(
  input: BusinessSurfaceContractInput,
  provenanceKind: BusinessSurfaceProvenanceKind = "governed_source",
): OmxdsSurfaceContract | null {
  if (!isVacationRentalSurfaceCategory(input.categorySlug)) return null;
  return createBusinessVerticalSurfaceContract(input, "business", provenanceKind);
}

export function createVacationRentalSemantics(
  partial: Partial<VacationRentalSemantics> = {},
): VacationRentalSemantics {
  const num = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const text = (value: string | null | undefined) => {
    const v = (value ?? "").trim();
    return v.length > 0 ? v : null;
  };
  return {
    wholeProperty: partial.wholeProperty ?? true,
    capacity: num(partial.capacity),
    bedrooms: num(partial.bedrooms),
    beds: num(partial.beds),
    bathrooms: num(partial.bathrooms),
    amenities: (partial.amenities ?? []).map((a) => a.trim()).filter(Boolean),
    kitchen: partial.kitchen ?? false,
    pool: partial.pool ?? false,
    minimumStayNights: num(partial.minimumStayNights),
    checkIn: text(partial.checkIn),
    checkOut: text(partial.checkOut),
    houseRules: (partial.houseRules ?? []).map((r) => r.trim()).filter(Boolean),
    availabilityNote: text(partial.availabilityNote),
    nightlyPrice: num(partial.nightlyPrice),
    approximateLocation: partial.approximateLocation ?? true,
  };
}
