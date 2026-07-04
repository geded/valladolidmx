/**
 * H-03 · Ola I2.c — `vmx.experience.reviews` (Capa 3: Comportamiento).
 *
 * Resuelve `source` en tiempo de render:
 *  - `manual`     → usa `config.items` y `config.aggregate` (opcional).
 *  - `business`   → hidrata desde `BusinessSurfaceContext`. Hoy
 *                   `MarketplaceBusinessDetail` no expone reseñas; el
 *                   bloque devuelve lista vacía + agregado nulo y usa
 *                   `emptyMessage`. Cuando el read exponga `reviews`,
 *                   basta con mapearlos aquí — sin cambios de contrato.
 *  - `product|destination|region|category|context|aggregator` → RESERVADO.
 *
 * Nota: la agregación se calcula localmente si no se provee
 * `aggregate` explícito, para que Studio / previews vean reputación
 * incluso con datos mínimos.
 */
import { useContext, useMemo } from "react";
import { ExperienceReviews } from "./ExperienceReviews";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";
import {
  buildExperienceReviewsPreviewDTO,
  computeAggregateFromItems,
  experienceReviewsConfigSchema,
  type ExperienceReviewItem,
  type ExperienceReviewsAggregate,
  type ExperienceReviewsConfig,
  type ExperienceReviewsDTO,
} from "@/lib/experience-builder/blocks/experience-reviews/contract";

function safeParse(raw: unknown): ExperienceReviewsConfig {
  const r = experienceReviewsConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceReviewsConfigSchema.parse({});
}

function applyFilters(
  items: ExperienceReviewItem[],
  cfg: ExperienceReviewsConfig,
): ExperienceReviewItem[] {
  const { filters, maxItems, sortBy, capabilities } = cfg;
  let out = items;

  // Moderación pública: sólo `approved` cuando esté activo.
  if (capabilities.moderationAware ?? true) {
    out = out.filter((it) => it.moderationStatus === "approved");
  }

  if (filters?.platforms && filters.platforms.length > 0) {
    const set = new Set(filters.platforms);
    out = out.filter((it) => set.has(it.platform));
  }
  if (filters?.minRating != null) {
    out = out.filter((it) => {
      const norm = (it.rating / (it.ratingScale || 5)) * 5;
      return norm >= filters.minRating!;
    });
  }
  if (filters?.languages && filters.languages.length > 0) {
    const set = new Set(filters.languages);
    out = out.filter((it) => (it.language ? set.has(it.language) : false));
  }
  if (filters?.travelerTypes && filters.travelerTypes.length > 0) {
    const set = new Set(filters.travelerTypes);
    out = out.filter((it) => (it.travelerType ? set.has(it.travelerType) : false));
  }
  if (filters?.onlyFeatured) {
    out = out.filter((it) => it.featured);
  }

  const norm = (it: ExperienceReviewItem) => (it.rating / (it.ratingScale || 5)) * 5;
  const ts = (it: ExperienceReviewItem) =>
    it.publishedAt ? Date.parse(it.publishedAt) : 0;
  out = [...out].sort((a, b) => {
    if (sortBy === "highest") return norm(b) - norm(a);
    if (sortBy === "lowest") return norm(a) - norm(b);
    if (sortBy === "helpful") return (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0);
    if (sortBy === "recommendedByAlux") {
      const ar = a.aluxRationale ? 1 : 0;
      const br = b.aluxRationale ? 1 : 0;
      if (ar !== br) return br - ar;
      return ts(b) - ts(a);
    }
    return ts(b) - ts(a);
  });

  if (maxItems != null) out = out.slice(0, maxItems);
  return out;
}

function buildDTO(
  cfg: ExperienceReviewsConfig,
  items: ExperienceReviewItem[],
  providedAggregate: ExperienceReviewsAggregate | null,
): ExperienceReviewsDTO {
  const aggregate =
    providedAggregate ?? (items.length > 0 ? computeAggregateFromItems(items) : null);
  return {
    variant: cfg.variant,
    heading: cfg.heading?.trim() || null,
    subheading: cfg.subheading?.trim() || null,
    emptyMessage: cfg.emptyMessage,
    columns: cfg.columns,
    groupBy: cfg.groupBy,
    sortBy: cfg.sortBy,
    ariaLabel: cfg.ariaLabel,
    items,
    aggregate,
    capabilities: {
      showAggregate: cfg.capabilities.showAggregate ?? true,
      showAggregateDistribution: cfg.capabilities.showAggregateDistribution ?? true,
      showByPlatform: cfg.capabilities.showByPlatform ?? true,
      showBusinessResponse: cfg.capabilities.showBusinessResponse ?? true,
      showTravelerType: cfg.capabilities.showTravelerType ?? true,
      showLanguage: cfg.capabilities.showLanguage ?? false,
      showHelpful: cfg.capabilities.showHelpful ?? true,
      showTags: cfg.capabilities.showTags ?? true,
      showPlatformBadge: cfg.capabilities.showPlatformBadge ?? true,
      showExternalLink: cfg.capabilities.showExternalLink ?? true,
      moderationAware: cfg.capabilities.moderationAware ?? true,
      sourceMixed: cfg.capabilities.sourceMixed ?? true,
      seoJsonLd: cfg.capabilities.seoJsonLd ?? true,
      compact: cfg.capabilities.compact ?? false,
      contextAware: cfg.capabilities.contextAware ?? false,
      aluxRecommended: cfg.capabilities.aluxRecommended ?? false,
      translateOnDemand: cfg.capabilities.translateOnDemand ?? false,
    },
    contextRefs: cfg.contextRefs ?? {},
  };
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export interface ExperienceReviewsBlockProps {
  config?: unknown;
}

export function ExperienceReviewsBlock({ config }: ExperienceReviewsBlockProps) {
  const cfg = safeParse(config);
  const business = useContext(BusinessSurfaceContext);

  const items = useMemo<ExperienceReviewItem[]>(() => {
    let base: ExperienceReviewItem[] = [];
    if (cfg.source === "business" && business) {
      // `MarketplaceBusinessDetail` no expone `reviews` todavía.
      // Al agregarse (I2.d+), mapear aquí con un adapter dedicado
      // — el contrato del bloque no cambia.
      base = [];
    } else {
      base = cfg.items;
    }
    return applyFilters(base, cfg);
  }, [cfg, business]);

  const dto = useMemo(
    () => buildDTO(cfg, items, cfg.aggregate ?? null),
    [cfg, items],
  );

  return <ExperienceReviews dto={dto} />;
}

export function ExperienceReviewsPreview() {
  return <ExperienceReviews dto={buildExperienceReviewsPreviewDTO()} />;
}