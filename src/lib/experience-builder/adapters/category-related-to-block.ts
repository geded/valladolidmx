/**
 * H-03 · E2 · US-E2.3 — Adapter Category Related → RelatedCollection.
 *
 * Traduce buckets de `CategoryRelatedDTO` al contrato universal
 * `ExperienceRelatedItem`. Sin acceso a red, sin lógica visual.
 * Reutiliza `businessRelatedToItems` (mismo shape) respetando la
 * Regla Evolutiva del bloque oficial.
 */
import type { MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import type { ExperienceRelatedItem } from "@/lib/experience-builder/blocks/experience-related-collection/contract";
import { businessRelatedToItems } from "./business-related-to-block";

export function categoryRelatedBusinessesToItems(
  businesses: MarketplaceBusinessCard[],
  rationale?: string | null,
): ExperienceRelatedItem[] {
  return businessRelatedToItems(businesses, "business", rationale ?? null);
}