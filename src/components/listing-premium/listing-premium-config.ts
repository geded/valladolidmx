/**
 * G8-E · `vmx.listing.premium-g5` — puente entre la configuración editable
 * del bloque compuesto y las props de `ListingPremiumSurface`.
 *
 * Fail-closed: cualquier campo ausente o inválido cae a la familia
 * aprobada correspondiente en `LISTING_PREMIUM_G5_FAMILIES`.
 */
import type { TourismCardVM } from "@/components/experience-builder/tourism-card/TourismCard";
import {
  LISTING_PREMIUM_G5_FAMILIES,
  listingCard,
  listingFamily,
  type ListingPremiumFamily,
} from "./listing-premium-content";

export const LISTING_PREMIUM_G5_BLOCK_TYPE = "vmx.listing.premium-g5" as const;
export const LISTING_PREMIUM_G5_CONTRACT_VERSION = "1.0.0" as const;
export const LISTING_PREMIUM_G5_VARIANT = "listado-premium-g5-approved" as const;

type Cfg = Record<string, unknown>;

const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const strOrNull = (value: unknown, fallback: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : (fallback ?? null);


const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const rows = (value: unknown): Cfg[] =>
  Array.isArray(value)
    ? value.filter((item): item is Cfg => Boolean(item) && typeof item === "object")
    : [];

const columnsOf = (value: unknown, fallback: 1 | 2 | 3): 1 | 2 | 3 =>
  value === 1 || value === 2 || value === 3 ? value : fallback;

export interface ListingPremiumG5Resolved {
  family: ListingPremiumFamily;
  hero: ListingPremiumFamily["hero"];
  items: TourismCardVM[];
  columns: 1 | 2 | 3;
  destinationSlug: string;
  destinationLabel: string;
  emptyMessage: string;
  showAddToTrip: boolean;
  showFavorite: boolean;
}

export function resolveListingPremiumG5(config: Cfg = {}): ListingPremiumG5Resolved {
  const family = listingFamily(str(config.family, "hoteles"));

  const itemRows = rows(config.items);
  const items: TourismCardVM[] =
    itemRows.length === 0
      ? family.items
      : itemRows.map((row, index) => {
          const base = family.items[index % family.items.length] as TourismCardVM;
          return listingCard({
            ...base,
            id: str(row.id, base.id),
            name: str(row.name, base.name),
            tagline: strOrNull(row.tagline, base.tagline),
            eyebrow: strOrNull(row.eyebrow, base.eyebrow),
            mediaUrl: strOrNull(row.media_url, base.mediaUrl),
            mediaAlt: strOrNull(row.media_alt, base.mediaAlt),
            priceHint: strOrNull(row.price_hint, base.priceHint),
            dateLabel: strOrNull(row.date_label, base.dateLabel),
            availabilityLabel: strOrNull(row.availability_label, base.availabilityLabel),
          });
        });

  return {
    family,
    hero: {
      eyebrow: str(config.hero_eyebrow, family.hero.eyebrow),
      title: str(config.hero_title, family.hero.title),
      subtitle: str(config.hero_subtitle, family.hero.subtitle),
      mediaUrl: strOrNull(config.hero_media_url, family.hero.mediaUrl),
      mediaAlt: strOrNull(config.hero_media_alt, family.hero.mediaAlt),
    },
    items,
    columns: columnsOf(config.columns, 3),
    destinationSlug: str(config.destination_slug, "valladolid"),
    destinationLabel: str(config.destination_label, "Valladolid"),
    emptyMessage: str(
      config.empty_message,
      "Aún no hay resultados publicados. Explora otros destinos del Oriente Maya.",
    ),
    showAddToTrip: bool(config.show_add_to_trip, false),
    showFavorite: bool(config.show_favorite, false),
  };
}

export function listingPremiumG5DefaultConfig(familyId = "hoteles"): Cfg {
  const family = listingFamily(familyId);
  return {
    variant: LISTING_PREMIUM_G5_VARIANT,
    family: family.id,
    hero_eyebrow: family.hero.eyebrow,
    hero_title: family.hero.title,
    hero_subtitle: family.hero.subtitle,
    hero_media_url: family.hero.mediaUrl ?? "",
    hero_media_alt: family.hero.mediaAlt ?? "",
    columns: 3,
    destination_slug: "valladolid",
    destination_label: "Valladolid",
    empty_message: "Aún no hay resultados publicados. Explora otros destinos del Oriente Maya.",
    show_add_to_trip: false,
    show_favorite: false,
    items: family.items.map((it) => ({
      id: it.id,
      name: it.name,
      eyebrow: it.eyebrow ?? "",
      tagline: it.tagline ?? "",
      media_url: it.mediaUrl ?? "",
      media_alt: it.mediaAlt ?? "",
      price_hint: it.priceHint ?? "",
      date_label: it.dateLabel ?? "",
      availability_label: it.availabilityLabel ?? "",
    })),
  };
}

export const LISTING_PREMIUM_G5_FAMILY_OPTIONS = LISTING_PREMIUM_G5_FAMILIES.map((f) => ({
  value: f.id,
  label: f.label,
}));
