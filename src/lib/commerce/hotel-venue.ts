/**
 * Restaurante del hotel · reglas compartidas.
 *
 * Un vínculo une dos negocios ya publicados: el anfitrión (normalmente un
 * hotel) y el negocio que está dentro de él (normalmente su restaurante).
 * Las reglas de presentación viven aquí para que ficha pública, Portal y
 * pruebas coincidan con lo que exige la base de datos (`business_venue_link_add`).
 */
import type { BusinessTeaser } from "@/types/entities";
import { resolveBusinessCanonicalUrl } from "@/lib/omxds/cards/business-card.adapter";

/** Máximo de negocios que un anfitrión puede mostrar en su ficha. */
export const MAX_VENUES_PER_HOST = 6;

export interface PublicVenue {
  link_id: string;
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category_slug: string;
  destination_slug: string;
  booking_enabled: boolean;
}

export interface LinkedBusiness {
  link_id: string;
  id: string;
  name: string;
  booking_enabled?: boolean;
}

export interface VenueCandidate {
  id: string;
  name: string;
  slug: string;
  category_slug: string;
  destination_slug: string;
}

/** Ancla oficial del cuadro de reserva (`TableBookingWidget`). */
export const TABLE_BOOKING_ANCHOR = "reservar-mesa";

export function venueTeaser(venue: PublicVenue): BusinessTeaser {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    category_slug: venue.category_slug,
    destination_slug: venue.destination_slug,
    tagline: venue.tagline,
    palette: "territorio",
  };
}

export function venueHref(venue: PublicVenue): string {
  return resolveBusinessCanonicalUrl(venueTeaser(venue));
}

/** Enlace directo al cuadro de reserva cuando el negocio acepta reservas. */
export function venueBookingHref(venue: PublicVenue): string {
  const href = venueHref(venue);
  return venue.booking_enabled ? `${href}#${TABLE_BOOKING_ANCHOR}` : href;
}

export function venueActionLabel(venue: PublicVenue): string {
  return venue.booking_enabled ? "Reservar mesa" : "Ver carta y horarios";
}

/** Etiquetas legibles para el visitante (los slug internos no se muestran tal cual). */
const CATEGORY_LABELS: Record<string, string> = {
  restaurantes: "Restaurante",
  restaurantes_y_cafes: "Restaurante y café",
  "restaurantes-y-cafes": "Restaurante y café",
  cafeterias: "Cafetería",
  "cafeterias-y-cafes": "Cafetería",
  cafes: "Cafetería",
  bares: "Bar",
  "panaderias-y-pastelerias": "Panadería",
  cocineras_tradicionales: "Cocinera tradicional",
  "cocineras-tradicionales": "Cocinera tradicional",
  hoteles: "Hotel",
};

function humanizeSlug(slug: string): string {
  const words = slug.replace(/[_-]+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function venueCategoryLabel(slug: string): string {
  const key = (slug || "").trim().toLowerCase();
  return CATEGORY_LABELS[key] ?? humanizeSlug(key);
}

export function venuePlaceLabel(slug: string): string {
  return (slug || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Reglas del vínculo, espejo de `business_venue_link_add`:
 * negocios distintos, sin duplicados en ninguna dirección y tope por anfitrión.
 */
export function venueLinkProblem(input: {
  hostId: string;
  venueId: string;
  current: LinkedBusiness[];
}): string | null {
  if (!input.hostId || !input.venueId) return "Elige los dos negocios que quieres vincular.";
  if (input.hostId === input.venueId) return "Un negocio no puede vincularse a sí mismo.";
  if (input.current.some((v) => v.id === input.venueId)) return "Ese vínculo ya existe.";
  if (input.current.length >= MAX_VENUES_PER_HOST) {
    return `Un hotel puede mostrar hasta ${MAX_VENUES_PER_HOST} restaurantes.`;
  }
  return null;
}

/** Candidatos que ofrece el Portal: publicados, distintos y aún no vinculados. */
export function filterVenueCandidates(
  candidates: VenueCandidate[],
  input: { selfId: string; current: LinkedBusiness[]; term: string },
): VenueCandidate[] {
  const term = input.term.trim().toLowerCase();
  const taken = new Set([input.selfId, ...input.current.map((v) => v.id)]);
  return candidates
    .filter((c) => !taken.has(c.id))
    .filter((c) => (term ? c.name.toLowerCase().includes(term) : true))
    .slice(0, MAX_VENUES_PER_HOST * 2);
}
