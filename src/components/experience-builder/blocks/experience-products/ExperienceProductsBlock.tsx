/**
 * H-03 · Ola I2.a — `vmx.experience.products` (Capa 3: Comportamiento).
 *
 * Resuelve `source` en tiempo de render:
 *  - `manual`     → usa `config.items`.
 *  - `business`   → hidrata desde `BusinessSurfaceContext`.
 *  - `destination|region|category|context` → RESERVADO (Ola I2.d+).
 *
 * Aporta interactividad (Favoritos + ProductActions) SIN acoplar la
 * presentación a los componentes de Marketplace: pasa un
 * `renderItemActions` que consulta un mapa de datos interactivos
 * construido a partir del contexto — cumple la Regla de Orquestación.
 */
import { useContext, useMemo } from "react";
import { ExperienceProducts } from "./ExperienceProducts";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import {
  ProductActions,
  type ProductActionsProduct,
} from "@/components/commerce/ProductActions";
import { BusinessSurfaceContext } from "@/components/surfaces/BusinessSurface";
import type { MarketplaceProductCard } from "@/lib/catalog/marketplace-reads.functions";
import {
  buildExperienceProductsPreviewDTO,
  experienceProductsConfigSchema,
  type ExperienceProductItem,
  type ExperienceProductsConfig,
  type ExperienceProductsDTO,
} from "@/lib/experience-builder/blocks/experience-products/contract";

function safeParse(raw: unknown): ExperienceProductsConfig {
  const r = experienceProductsConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : experienceProductsConfigSchema.parse({});
}

/* ------------------------------------------------------------------ *
 * Adapter: MarketplaceProductCard → ExperienceProductItem
 * ------------------------------------------------------------------ */
export function marketplaceProductToItem(
  p: MarketplaceProductCard,
): ExperienceProductItem {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline || null,
    productType: p.product_type || null,
    entityKind: "product",
    href: p.business_slug && p.slug
      ? `/marketplace/${p.business_slug}#p-${p.slug}`
      : null,
    mediaUrl: null,
    mediaAlt: null,
    priceAmount: p.price_amount != null ? Number(p.price_amount) : null,
    priceCurrency: p.price_currency || "MXN",
    priceHint: null,
    businessId: null,
    businessName: p.business_name || null,
    rating: null,
    location: null,
    highlights: [],
    dateLabel: null,
    badges: [],
    primaryAction: null,
    secondaryAction: null,
  };
}

function applyFilters(
  items: ExperienceProductItem[],
  cfg: ExperienceProductsConfig,
): ExperienceProductItem[] {
  const { filters, maxItems } = cfg;
  let out = items;
  const types = filters?.productTypes ?? [];
  if (types.length > 0) {
    out = out.filter((it) => (it.productType ? types.includes(it.productType) : false));
  }
  if (maxItems != null) out = out.slice(0, maxItems);
  return out;
}

function buildDTO(
  cfg: ExperienceProductsConfig,
  items: ExperienceProductItem[],
): ExperienceProductsDTO {
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
      showPrice: cfg.capabilities.showPrice ?? true,
      showFavorite: cfg.capabilities.showFavorite ?? true,
      showActions: cfg.capabilities.showActions ?? true,
      showBusiness: cfg.capabilities.showBusiness ?? false,
      showMedia: cfg.capabilities.showMedia ?? true,
      compact: cfg.capabilities.compact ?? false,
      contextAware: cfg.capabilities.contextAware ?? false,
      livePricing: cfg.capabilities.livePricing ?? false,
      liveAvailability: cfg.capabilities.liveAvailability ?? false,
    },
    contextRefs: cfg.contextRefs ?? {},
  };
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export interface ExperienceProductsBlockProps {
  config?: unknown;
}

export function ExperienceProductsBlock({ config }: ExperienceProductsBlockProps) {
  const cfg = safeParse(config);
  const business = useContext(BusinessSurfaceContext);

  // Mapa interactivo (id → datos ProductActions) para no ensuciar el DTO.
  const { items, interactiveMap } = useMemo(() => {
    const interactive = new Map<string, ProductActionsProduct>();
    let baseItems: ExperienceProductItem[] = [];

    if (cfg.source === "business" && business) {
      const filtered =
        cfg.filters?.businessId && cfg.filters.businessId !== business.id
          ? []
          : business.products;
      baseItems = filtered.map((p) => {
        interactive.set(p.id, {
          id: p.id,
          conversion_mode: p.conversion_mode,
          primary_action_label: p.primary_action_label,
          secondary_action_mode: p.secondary_action_mode,
          secondary_action_label: p.secondary_action_label,
          accepts_online_payment: p.accepts_online_payment,
        });
        return marketplaceProductToItem(p);
      });
    } else {
      baseItems = cfg.items;
    }
    return { items: applyFilters(baseItems, cfg), interactiveMap: interactive };
  }, [cfg, business]);

  const dto = useMemo(() => buildDTO(cfg, items), [cfg, items]);

  return (
    <ExperienceProducts
      dto={dto}
      renderItemActions={(item) => {
        const showFav = dto.capabilities.showFavorite;
        const interactive = interactiveMap.get(item.id);
        return (
          <>
            {showFav ? (
              <FavoriteButton entityKind="product" entityId={item.id} />
            ) : null}
            {dto.capabilities.showActions && interactive ? (
              <ProductActions product={interactive} />
            ) : null}
          </>
        );
      }}
    />
  );
}

export function ExperienceProductsPreview() {
  return <ExperienceProducts dto={buildExperienceProductsPreviewDTO()} />;
}