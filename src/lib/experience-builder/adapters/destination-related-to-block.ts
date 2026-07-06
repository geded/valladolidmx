/**
 * H-03 · Ola I3.b — Adapter Destination Related → RelatedCollection.
 *
 * Traduce los buckets de `DestinationRelatedDTO` (empresas por
 * categoría, productos, eventos) al contrato universal
 * `ExperienceRelatedItem`. Sin lógica visual, sin acceso a red — sólo
 * mapeo puro para el bloque `vmx.experience.related-collection`.
 */
import type {
  MarketplaceBusinessCard,
  MarketplaceProductCard,
} from "@/lib/catalog/marketplace-reads.functions";
import type { PublicEventCard } from "@/lib/events/public-reads.functions";
import type {
  ExperienceRelatedEntityKind,
  ExperienceRelatedItem,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import { EXPERIENCE_RELATED_ITEM_V11_DEFAULTS as V11 } from "@/lib/experience-builder/blocks/experience-related-collection/contract";

/** Mapea empresas del marketplace a items universales. */
export function destinationRelatedBucketToItems(
  businesses: MarketplaceBusinessCard[],
  kind: ExperienceRelatedEntityKind,
  rationale?: string | null,
): ExperienceRelatedItem[] {
  return businesses.map((b) => ({
    ...V11,
    id: b.id,
    kind,
    title: b.display_name,
    subtitle: null,
    description: b.tagline || null,
    href: `/marketplace/${b.slug}`,
    imageUrl: null,
    imageAlt: null,
    meta: [],
    badges: b.verified ? [{ label: "Verificado", tone: "primary" as const }] : [],
    tags: [],
    priceAmount: null,
    priceCurrency: null,
    dateStart: null,
    dateEnd: null,
    destinationSlug: b.destination_slug || null,
    categorySlug: b.category_slug || null,
    rationale: rationale ?? null,
    sourceHint: "destination",
    score: null,
  }));
}

/** Mapea productos del marketplace a items universales. */
export function destinationRelatedProductsToItems(
  products: MarketplaceProductCard[],
  rationale?: string | null,
): ExperienceRelatedItem[] {
  return products.map((p) => ({
    ...V11,
    id: p.id,
    kind: "product",
    title: p.name,
    subtitle: p.business_name || null,
    description: p.tagline || null,
    href: `/producto/${p.slug}`,
    imageUrl: null,
    imageAlt: null,
    meta: p.product_type ? [{ label: p.product_type }] : [],
    badges: [],
    tags: [],
    priceAmount: p.price_amount != null ? Number(p.price_amount) : null,
    priceCurrency: p.price_currency || "MXN",
    dateStart: null,
    dateEnd: null,
    destinationSlug: null,
    categorySlug: null,
    rationale: rationale ?? null,
    sourceHint: "destination",
    score: null,
  }));
}

/** Mapea eventos públicos a items universales. */
export function destinationRelatedEventsToItems(
  events: PublicEventCard[],
  rationale?: string | null,
): ExperienceRelatedItem[] {
  return events.map((e) => ({
    ...V11,
    id: e.id,
    kind: "event",
    title: e.title,
    subtitle: e.venue_name || null,
    description: e.summary || null,
    href: `/eventos/${e.slug}`,
    imageUrl: e.cover_url || null,
    imageAlt: e.title,
    meta: [],
    badges: e.is_free ? [{ label: "Gratis", tone: "success" as const }] : [],
    tags: [],
    priceAmount: null,
    priceCurrency: null,
    dateStart: e.starts_at || null,
    dateEnd: e.ends_at || null,
    destinationSlug: e.destination_slug || null,
    categorySlug: null,
    rationale: rationale ?? null,
    sourceHint: "destination",
    score: null,
  }));
}