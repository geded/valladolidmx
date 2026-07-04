/**
 * H-03 · E2 · US-E2.1 — Adapter Business Related → RelatedCollection.
 *
 * Traduce buckets de `BusinessRelatedDTO` (empresas hermanas del mismo
 * destino) al contrato universal `ExperienceRelatedItem`. Sin acceso a
 * red, sin lógica visual — mapeo puro para el bloque oficial
 * `vmx.experience.related-collection`.
 *
 * URLs canónicas territoriales (Navigation Contract v1.0):
 *   /oriente-maya/:destino/:categoria/:empresa
 */
import type { MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import type {
  ExperienceRelatedEntityKind,
  ExperienceRelatedItem,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import { resolveCanonicalPath } from "@/lib/navigation/canonical-paths";

export function businessRelatedToItems(
  businesses: MarketplaceBusinessCard[],
  kind: ExperienceRelatedEntityKind = "business",
  rationale?: string | null,
): ExperienceRelatedItem[] {
  return businesses.map((b) => ({
    id: b.id,
    kind,
    title: b.display_name,
    subtitle: null,
    description: b.tagline || null,
    href:
      b.destination_slug && b.category_slug
        ? resolveCanonicalPath({
            kind: "business",
            slug: b.slug,
            destination: b.destination_slug,
            category: b.category_slug,
          })
        : `/marketplace/${b.slug}`,
    imageUrl: null,
    imageAlt: null,
    meta: [],
    badges: b.verified
      ? [{ label: "Verificado", tone: "primary" as const }]
      : [],
    tags: [],
    priceAmount: null,
    priceCurrency: null,
    dateStart: null,
    dateEnd: null,
    destinationSlug: b.destination_slug || null,
    categorySlug: b.category_slug || null,
    rationale: rationale ?? null,
    sourceHint: "business",
    score: null,
  }));
}