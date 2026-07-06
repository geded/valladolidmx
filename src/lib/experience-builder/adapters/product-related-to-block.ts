/**
 * H-03 · E2 · US-E2.2 — Adapter Product Related → RelatedCollection.
 *
 * Traduce `MarketplaceProductCard[]` al contrato universal
 * `ExperienceRelatedItem` para el bloque oficial
 * `vmx.experience.related-collection`. Sin acceso a red.
 *
 * Hrefs canónicos territoriales (Navigation Contract v1.0):
 *   /oriente-maya/:destino/:categoria/:empresa/:producto
 */
import type { MarketplaceProductCard } from "@/lib/catalog/marketplace-reads.functions";
import type {
  ExperienceRelatedItem,
} from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import { EXPERIENCE_RELATED_ITEM_V11_DEFAULTS as V11 } from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import { resolveCanonicalPath } from "@/lib/navigation/canonical-paths";

export function productRelatedToItems(
  products: MarketplaceProductCard[],
  opts: {
    destinationSlug?: string | null;
    categorySlug?: string | null;
    rationale?: string | null;
  } = {},
): ExperienceRelatedItem[] {
  return products.map((p) => {
    const dest = opts.destinationSlug ?? null;
    const cat = opts.categorySlug ?? null;
    const href =
      dest && cat && p.business_slug
        ? resolveCanonicalPath({
            kind: "product",
            slug: p.slug,
            business: p.business_slug,
            category: cat,
            destination: dest,
          })
        : `/producto/${p.slug}`;
    return {
      ...V11,
      id: p.id,
      kind: "product",
      title: p.name,
      subtitle: p.business_name || null,
      description: p.tagline || null,
      href,
      imageUrl: null,
      imageAlt: null,
      meta: p.product_type ? [{ label: p.product_type }] : [],
      badges: [],
      tags: [],
      priceAmount: p.price_amount != null ? Number(p.price_amount) : null,
      priceCurrency: p.price_currency || "MXN",
      dateStart: null,
      dateEnd: null,
      destinationSlug: dest,
      categorySlug: cat,
      rationale: opts.rationale ?? null,
      sourceHint: "product",
      score: null,
    };
  });
}