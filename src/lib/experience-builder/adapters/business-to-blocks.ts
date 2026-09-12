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
import type { ExperienceProductsDTO } from "@/lib/experience-builder/blocks/experience-products/contract";
import { marketplaceProductToItem } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import type { ExperiencePromotionsDTO } from "@/lib/experience-builder/blocks/experience-promotions/contract";
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
    meta.push({ iconKey: "map-pin", label: humanizeSlug(b.destination_slug) });
  }
  meta.push({ iconKey: "tag", label: variant.eyebrow });

  const slides = b.cover_url
    ? [{ url: b.cover_url, alt: b.display_name, focalPoint: "center" }]
    : [];

  return {
    variant: slides.length > 0 ? "gallery" : "editorial",
    eyebrow: variant.eyebrow,
    title: b.display_name,
    description: b.tagline || null,
    media: slides[0] ? { url: slides[0].url, alt: slides[0].alt, overlay: 0 } : null,
    mediaSlides: slides,
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
    anchors: EXPERIENCE_SUBNAV_PRESETS.business.filter((a) => a.id !== "promociones" || showPromos),
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
/** Iconografía oficial por eje administrable (sin datos, sólo presentación). */
const ATTRIBUTE_ICON_BY_KEY: Record<string, string> = {
  property_type: "home",
  capacity: "users",
  bedrooms: "bed",
  beds: "bed",
  bathrooms: "droplet",
  zone: "map-pin",
  amenities: "sparkles",
  spaces: "layout",
  includes: "check",
  stay_features: "star",
  traveler_profile: "heart",
  accessibility: "accessibility",
  check_in: "log-in",
  check_out: "log-out",
  min_nights: "calendar",
  cancellation_policy: "shield",
  host_languages: "languages",
  house_rules: "info",
  price_level: "tag",
  hotel_type: "home",
  services: "concierge-bell",
  policies: "info",
};

function humanizeSlug(slug: string): string {
  const clean = slug.trim().replace(/-/g, " ").toLowerCase();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function businessToInfoGridDTO(b: MarketplaceBusinessDetail): ExperienceInfoGridDTO | null {
  const variant = resolveBusinessVariant(b.category_slug);
  const items: ExperienceInfoGridDTO["items"] = [];
  if (b.destination_slug) {
    items.push({
      iconKey: "map-pin",
      label: "Destino",
      value: humanizeSlug(b.destination_slug),
      tone: "default",
    });
  }
  if (b.category_slug) {
    /* La categoría mostrada proviene del slug real declarado en el CMS,
       no del agrupador editorial del hero. */
    items.push({
      iconKey: "tag",
      label: "Categoría",
      value: humanizeSlug(b.category_slug),
      tone: "default",
    });
  }
  items.push({
    iconKey: "badge-check",
    label: "Estado",
    value: b.verified ? "Verificado" : "Publicado",
    tone: b.verified ? "primary" : "default",
  });
  /* Atributos administrables: siempre con la etiqueta del catálogo CMS.
     Sin catálogo resuelto no se muestran claves crudas. */
  const resolved = b.attributes ?? [];
  for (const key of ["property_type", "capacity", "bedrooms", "amenities", "stay_features"]) {
    const attribute = resolved.find((item) => item.key === key);
    if (!attribute || attribute.values.length === 0) continue;
    items.push({
      iconKey: ATTRIBUTE_ICON_BY_KEY[key] ?? "home",
      label: attribute.label,
      value: attribute.values.map((value) => value.label).join(" · "),
      tone: "default",
    });
  }
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
 * Composición Casa de vacaciones — agrupaciones editoriales sobre el
 * MISMO bloque oficial `vmx.experience.info-grid`. Sin bloques nuevos,
 * sin datos inventados: sólo ejes administrables con etiqueta CMS.
 * ------------------------------------------------------------------ */
function attributesGridDTO(
  b: MarketplaceBusinessDetail,
  keys: readonly string[],
  heading: string,
  variant: "cards" | "list" | "inline",
  columns: number,
): ExperienceInfoGridDTO | null {
  const resolved = b.attributes ?? [];
  const items: ExperienceInfoGridDTO["items"] = [];
  for (const key of keys) {
    const attribute = resolved.find((item) => item.key === key);
    if (!attribute || attribute.values.length === 0) continue;
    items.push({
      iconKey: ATTRIBUTE_ICON_BY_KEY[key] ?? "info",
      label: attribute.label,
      value: attribute.values.map((value) => value.label).join(" · "),
      tone: "default",
    });
  }
  if (items.length === 0) return null;
  return {
    variant,
    heading,
    columns: Math.min(columns, Math.max(1, items.length)),
    items,
    ariaLabel: heading,
    capabilities: { copyable: false, livePricing: false, liveAvailability: false },
  };
}

/** Lo esencial del alojamiento (capacidad, dormitorios, camas, baños…). */
export function businessToStayEssentialsDTO(
  b: MarketplaceBusinessDetail,
): ExperienceInfoGridDTO | null {
  return attributesGridDTO(
    b,
    [
      "property_type",
      "hotel_type",
      "capacity",
      "bedrooms",
      "beds",
      "bathrooms",
      "zone",
      "price_level",
    ],
    "Lo esencial del alojamiento",
    "cards",
    3,
  );
}

/** Amenidades, espacios y lo que incluye la estancia. */
export function businessToStayAmenitiesDTO(
  b: MarketplaceBusinessDetail,
): ExperienceInfoGridDTO | null {
  const resolved = b.attributes ?? [];
  const items: ExperienceInfoGridDTO["items"] = [];
  for (const key of [
    "amenities",
    "services",
    "spaces",
    "includes",
    "stay_features",
    "accessibility",
  ]) {
    const attribute = resolved.find((item) => item.key === key);
    if (!attribute || attribute.values.length === 0) continue;
    /* Cada amenidad se lee como un elemento propio, no como una cadena
       concatenada; el eje CMS se conserva como título del grupo. */
    for (const value of attribute.values) {
      items.push({
        iconKey: ATTRIBUTE_ICON_BY_KEY[key] ?? "info",
        label: attribute.label,
        value: value.label,
        tone: "default",
      });
    }
  }
  if (items.length === 0) return null;
  return {
    variant: "checklist",
    heading: "Amenidades y espacios",
    columns: 2,
    items,
    ariaLabel: "Amenidades y espacios",
    capabilities: { copyable: false, livePricing: false, liveAvailability: false },
  };
}

/**
 * Condiciones de la estancia: llegada, salida, mínimo, anfitrión y reglas.
 * No se muestra política de cancelación: la plataforma no opera reservación
 * ni cobro en línea, y ese dato sólo tiene sentido con un pago de por medio.
 */
export function businessToStayPolicyDTO(
  b: MarketplaceBusinessDetail,
): ExperienceInfoGridDTO | null {
  return attributesGridDTO(
    b,
    [
      "check_in",
      "check_out",
      "min_nights",
      "host_languages",
      "house_rules",
      "policies",
      "traveler_profile",
    ],
    "Tu estancia",
    "cards",
    3,
  );
}

/* ------------------------------------------------------------------ *
 * CTA Bar mobile — barra inferior persistente.
 * ------------------------------------------------------------------ */
export function businessToCtaBarDTO(b: MarketplaceBusinessDetail): ExperienceCtaBarDTO {
  return {
    variant: "bar",
    label: b.display_name,
    meta: b.tagline || null,
    actions: [{ label: "Contactar", action: "contact", href: "#contacto", emphasis: "primary" }],
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
/* Hospedaje: la tarifa publicada del CMS es por noche. Sólo se declara como
   pista de precio; nunca implica cobro ni reservación en línea. Las claves son
   las mismas que usa la Plantilla Business aprobada. */
const LODGING_KEYS = new Set([
  "hotel",
  "hoteles",
  "hospedaje",
  "hospedajes",
  "alojamiento",
  "vacation_rental",
  "casas-de-vacaciones",
  "casa-de-vacaciones",
]);

export function isLodgingBusiness(b: {
  category_family_key?: string | null;
  category_slug?: string | null;
}): boolean {
  return (
    LODGING_KEYS.has((b.category_family_key ?? "").trim().toLowerCase()) ||
    LODGING_KEYS.has((b.category_slug ?? "").trim().toLowerCase())
  );
}

export function businessToProductsDTO(b: MarketplaceBusinessDetail): ExperienceProductsDTO {
  const variant = resolveBusinessVariant(b.category_slug);
  const isLodging = isLodgingBusiness(b);
  return {
    variant: "grid",
    heading: variant.productsHeading,
    subheading: null,
    emptyMessage: variant.productsEmpty,
    columns: 2,
    groupBy: "none",
    ariaLabel: variant.productsHeading,
    items: b.products.map((p) => {
      const item = marketplaceProductToItem(p);
      return isLodging && item.priceAmount != null
        ? { ...item, priceHint: "por noche" }
        : item;
    }),
    capabilities: {
      showPrice: true,
      showFavorite: true,
      showActions: true,
      showBusiness: false,
      /* La portada CMS de cada producto (`product_media` role=cover) ya
         llega firmada en el DTO: la tarjeta oficial la muestra y, sin
         medio acreditado, usa su fallback editorial aprobado. */
      showMedia: true,
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
export function businessToPromotionsDTO(b: MarketplaceBusinessDetail): ExperiencePromotionsDTO {
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
