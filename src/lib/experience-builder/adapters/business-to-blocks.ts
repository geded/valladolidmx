/**
 * H-03 · Ola I1.d — Adapter Business → Bloques Oficiales.
 *
 * Mapea `MarketplaceBusinessDetail` a los DTOs de los bloques oficiales
 * de la Biblioteca del Experience Builder (I1.a-c). NO crea nuevos
 * componentes ni contratos: sólo traduce el modelo de negocio al
 * contrato ya aprobado de cada bloque.
 *
 * Regla de Compatibilidad Evolutiva: si un dato del negocio no encaja
 * en un bloque existente, se documenta en el Closure Report como
 * "candidato a evolución" antes de crear cualquier bloque nuevo.
 */
import { resolveBusinessVariant } from "@/components/surfaces/BusinessSurface";
import type { MarketplaceBusinessDetail } from "@/lib/catalog/marketplace-reads.functions";
import type { ExperienceHeroDTO } from "@/lib/experience-builder/blocks/experience-hero/contract";
import type { ExperienceSubnavDTO } from "@/lib/experience-builder/blocks/experience-subnav/contract";
import { EXPERIENCE_SUBNAV_PRESETS } from "@/lib/experience-builder/blocks/experience-subnav/contract";
import type { ExperienceSectionDTO } from "@/lib/experience-builder/blocks/experience-section/contract";
import type { ExperienceInfoGridDTO } from "@/lib/experience-builder/blocks/experience-info-grid/contract";
import type { ExperienceCtaBarDTO } from "@/lib/experience-builder/blocks/experience-cta-bar/contract";
import type {
  ExperienceProductsDTO,
} from "@/lib/experience-builder/blocks/experience-products/contract";
import { marketplaceProductToItem } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import type {
  ExperiencePromotionsDTO,
} from "@/lib/experience-builder/blocks/experience-promotions/contract";
import { marketplacePromotionToItem } from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotionsBlock";

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */
export function businessToHeroDTO(b: MarketplaceBusinessDetail): ExperienceHeroDTO {
  const variant = resolveBusinessVariant(b.category_slug);
  const badges: ExperienceHeroDTO["badges"] = [];
  if (b.verified) {
    badges.push({ label: "Verificado", tone: "primary", iconKey: "badge-check" });
  }
  const meta: ExperienceHeroDTO["meta"] = [];
  if (b.destination_slug) {
    meta.push({ iconKey: "map-pin", label: b.destination_slug.replace(/-/g, " ") });
  }

  return {
    variant: "editorial",
    eyebrow: variant.eyebrow,
    title: b.display_name,
    description: b.tagline || null,
    media: null,
    badges,
    meta,
    ctaPrimary: null,
    ctaSecondary: null,
  };
}

/* ------------------------------------------------------------------ *
 * Subnav — usa el preset oficial "business".
 * ------------------------------------------------------------------ */
export function businessToSubnavDTO(b: MarketplaceBusinessDetail): ExperienceSubnavDTO {
  const showPromos = b.promotions.length > 0;
  return {
    variant: "pill",
    sticky: true,
    scrollOffset: 80,
    ariaLabel: "Secciones de la ficha",
    anchors: EXPERIENCE_SUBNAV_PRESETS.business.filter(
      (a) => a.id !== "promociones" || showPromos,
    ),
    capabilities: { scrollSpy: true, collapseOnMobile: true, showIcons: false },
  };
}

/* ------------------------------------------------------------------ *
 * Section — descripción larga.
 * ------------------------------------------------------------------ */
export function businessToDescriptionSectionDTO(
  b: MarketplaceBusinessDetail,
): ExperienceSectionDTO | null {
  if (!b.description) return null;
  return {
    variant: "editorial",
    eyebrow: null,
    title: `Sobre ${b.display_name}`,
    lead: null,
    body: b.description,
    media: null,
    attribution: null,
    ctas: [],
    align: "left",
    tone: "default",
    ariaLabel: `Sobre ${b.display_name}`,
    capabilities: { anchor: true, seoHeading: true, richText: false },
  };
}

/* ------------------------------------------------------------------ *
 * Info-grid — datos rápidos.
 * ------------------------------------------------------------------ */
export function businessToInfoGridDTO(
  b: MarketplaceBusinessDetail,
): ExperienceInfoGridDTO | null {
  const variant = resolveBusinessVariant(b.category_slug);
  const items: ExperienceInfoGridDTO["items"] = [];
  if (b.destination_slug) {
    items.push({
      iconKey: "map-pin",
      label: "Destino",
      value: b.destination_slug.replace(/-/g, " "),
      tone: "default",
    });
  }
  if (b.category_slug) {
    items.push({
      iconKey: "tag",
      label: "Categoría",
      value: variant.eyebrow,
      tone: "default",
    });
  }
  items.push({
    iconKey: "badge-check",
    label: "Estado",
    value: b.verified ? "Verificado" : "Publicado",
    tone: b.verified ? "primary" : "default",
  });
  if (items.length === 0) return null;
  return {
    variant: "cards",
    heading: null,
    columns: Math.min(3, Math.max(1, items.length)),
    items,
    ariaLabel: "Información clave",
    capabilities: { copyable: false, livePricing: false, liveAvailability: false },
  };
}

/* ------------------------------------------------------------------ *
 * CTA Bar mobile — barra inferior persistente.
 * ------------------------------------------------------------------ */
export function businessToCtaBarDTO(b: MarketplaceBusinessDetail): ExperienceCtaBarDTO {
  return {
    variant: "bar",
    label: b.display_name,
    meta: b.tagline || null,
    actions: [
      { label: "Contactar", action: "contact", href: "#contacto", emphasis: "primary" },
    ],
    revealAfterScroll: 480,
    desktopPosition: "bottom",
    ariaLabel: "Acciones principales de la ficha",
    capabilities: {
      hideOnScrollDown: false,
      showPriceBadge: false,
      showFavorite: false,
      showShare: false,
    },
  };
}

/* ------------------------------------------------------------------ *
 * H-03 · Ola I2.a — Products
 *
 * Adapter neutro: mapea el catálogo del negocio a un DTO consumible
 * por `vmx.experience.products`. La Plantilla Business no vuelve a
 * pintar `<ul>` — sólo orquesta bloques oficiales.
 * ------------------------------------------------------------------ */
export function businessToProductsDTO(
  b: MarketplaceBusinessDetail,
): ExperienceProductsDTO {
  const variant = resolveBusinessVariant(b.category_slug);
  return {
    variant: "grid",
    heading: variant.productsHeading,
    subheading: null,
    emptyMessage: variant.productsEmpty,
    columns: 2,
    groupBy: "none",
    ariaLabel: variant.productsHeading,
    items: b.products.map(marketplaceProductToItem),
    capabilities: {
      showPrice: true,
      showFavorite: true,
      showActions: true,
      showBusiness: false,
      showMedia: false,
      compact: false,
      contextAware: false,
      livePricing: false,
      liveAvailability: false,
    },
    contextRefs: {
      businessSlug: b.slug,
      destinationSlug: b.destination_slug ?? null,
      categorySlug: b.category_slug ?? null,
    },
  };
}

/* ------------------------------------------------------------------ *
 * H-03 · Ola I2.b — Promotions
 *
 * Adapter neutro: mapea las promociones del negocio a un DTO
 * consumible por `vmx.experience.promotions`. La Plantilla Business no
 * vuelve a pintar `<ul>` — sólo orquesta bloques oficiales.
 * ------------------------------------------------------------------ */
export function businessToPromotionsDTO(
  b: MarketplaceBusinessDetail,
): ExperiencePromotionsDTO {
  return {
    variant: "grid",
    heading: "Promociones vigentes",
    subheading: null,
    emptyMessage: "Sin promociones vigentes por ahora.",
    columns: 2,
    groupBy: "none",
    ariaLabel: "Promociones y oportunidades",
    items: b.promotions.map(marketplacePromotionToItem),
    capabilities: {
      showDiscount: true,
      showExpiry: true,
      showFavorite: true,
      showActions: true,
      showBusiness: false,
      showMedia: false,
      showCouponCode: true,
      urgencyAware: true,
      compact: false,
      contextAware: false,
      liveDiscount: false,
      audienceAware: false,
    },
    contextRefs: {
      businessSlug: b.slug,
      destinationSlug: b.destination_slug ?? null,
      categorySlug: b.category_slug ?? null,
    },
  };
}