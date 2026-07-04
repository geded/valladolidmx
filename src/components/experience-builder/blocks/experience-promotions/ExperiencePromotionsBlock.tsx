/**
 * H-03 · Ola I2.b — `vmx.experience.promotions` (Capa 3: Comportamiento).
 *
 * Resuelve `source` en tiempo de render:
 *  - `manual`     → usa `config.items`.
 *  - `business`   → hidrata desde `BusinessSurfaceContext`.
 *  - `destination|region|category|context|campaign` → RESERVADO (I2.d+).
 *
 * Añade interactividad (Favoritos) SIN acoplar la presentación a los
 * componentes de Marketplace — cumple la Regla de Orquestación.
 */
import { useContext, useMemo } from "react";
import { ExperiencePromotions } from "./ExperiencePromotions";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";
import type { MarketplacePromotionCard } from "@/lib/marketplace/marketplace-reads.functions";
import {
  buildExperiencePromotionsPreviewDTO,
  computeUrgencyDays,
  experiencePromotionsConfigSchema,
  type ExperiencePromotionItem,
  type ExperiencePromotionsConfig,
  type ExperiencePromotionsDTO,
} from "@/lib/experience-builder/blocks/experience-promotions/contract";

function safeParse(raw: unknown): ExperiencePromotionsConfig {
  const r = experiencePromotionsConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experiencePromotionsConfigSchema.parse({});
}

/* ------------------------------------------------------------------ *
 * Adapter: MarketplacePromotionCard → ExperiencePromotionItem
 * ------------------------------------------------------------------ */
export function marketplacePromotionToItem(
  p: MarketplacePromotionCard,
): ExperiencePromotionItem {
  return {
    id: p.id,
    title: p.title,
    description: p.description || null,
    href: p.business_slug ? `/marketplace/${p.business_slug}#promo-${p.slug}` : null,
    mediaUrl: null,
    mediaAlt: null,
    discountPercent: p.discount_percent != null ? Number(p.discount_percent) : null,
    discountLabel: null,
    priceOriginal: null,
    pricePromo: null,
    priceCurrency: null,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    couponCode: null,
    businessId: null,
    businessName: p.business_name || null,
    businessSlug: p.business_slug || null,
    productId: null,
    productSlug: null,
    badges: [],
    primaryAction: null,
    secondaryAction: null,
  };
}

function applyFilters(
  items: ExperiencePromotionItem[],
  cfg: ExperiencePromotionsConfig,
): ExperiencePromotionItem[] {
  const { filters, maxItems } = cfg;
  let out = items;
  const min = filters?.minDiscountPercent ?? null;
  if (min != null) {
    out = out.filter((it) => (it.discountPercent ?? 0) >= min);
  }
  if (filters?.onlyActive) {
    out = out.filter((it) => {
      const days = computeUrgencyDays(it.endsAt);
      return days == null || days >= 0;
    });
  }
  if (maxItems != null) out = out.slice(0, maxItems);
  return out;
}

function buildDTO(
  cfg: ExperiencePromotionsConfig,
  items: ExperiencePromotionItem[],
): ExperiencePromotionsDTO {
  return {
    variant: cfg.variant,
    heading: cfg.heading?.trim() || null,
    subheading: cfg.subheading?.trim() || null,
    emptyMessage: cfg.emptyMessage,
    columns: cfg.columns,
    groupBy: cfg.groupBy,
    ariaLabel: cfg.ariaLabel,
    items,
    capabilities: {
      showDiscount: cfg.capabilities.showDiscount ?? true,
      showExpiry: cfg.capabilities.showExpiry ?? true,
      showFavorite: cfg.capabilities.showFavorite ?? true,
      showActions: cfg.capabilities.showActions ?? true,
      showBusiness: cfg.capabilities.showBusiness ?? false,
      showMedia: cfg.capabilities.showMedia ?? true,
      showCouponCode: cfg.capabilities.showCouponCode ?? true,
      urgencyAware: cfg.capabilities.urgencyAware ?? true,
      compact: cfg.capabilities.compact ?? false,
      contextAware: cfg.capabilities.contextAware ?? false,
      liveDiscount: cfg.capabilities.liveDiscount ?? false,
      audienceAware: cfg.capabilities.audienceAware ?? false,
    },
    contextRefs: cfg.contextRefs ?? {},
  };
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export interface ExperiencePromotionsBlockProps {
  config?: unknown;
}

export function ExperiencePromotionsBlock({ config }: ExperiencePromotionsBlockProps) {
  const cfg = safeParse(config);
  const business = useContext(BusinessSurfaceContext);

  const items = useMemo<ExperiencePromotionItem[]>(() => {
    let base: ExperiencePromotionItem[] = [];
    if (cfg.source === "business" && business) {
      const filtered =
        cfg.filters?.businessId && cfg.filters.businessId !== business.id
          ? []
          : business.promotions;
      base = filtered.map(marketplacePromotionToItem);
    } else {
      base = cfg.items;
    }
    return applyFilters(base, cfg);
  }, [cfg, business]);

  const dto = useMemo(() => buildDTO(cfg, items), [cfg, items]);

  return (
    <ExperiencePromotions
      dto={dto}
      renderItemActions={(item) => {
        const showFav = dto.capabilities.showFavorite;
        return (
          <>
            {showFav ? (
              <FavoriteButton entityKind="promotion" entityId={item.id} />
            ) : null}
          </>
        );
      }}
    />
  );
}

export function ExperiencePromotionsPreview() {
  return <ExperiencePromotions dto={buildExperiencePromotionsPreviewDTO()} />;
}