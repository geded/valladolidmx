/**
 * US-R3 · Ola 2 · Sub-ola 2.2 — BusinessSurface (Plantilla Madre)
 *
 * Plantilla oficial UNIVERSAL para toda ficha pública de negocio de
 * Valladolid.mx: empresas, hoteles, restaurantes, cenotes, museos,
 * agencias, tours, transportistas, tiendas, servicios, y cualquier
 * categoría futura. NO existirán plantillas independientes por
 * categoría — la categoría es una variante de esta misma plantilla.
 *
 * Reglas arquitectónicas (Founder, 15.10.4d):
 *  1. Adopción reproductiva: paridad 1:1 con la ficha actual servida
 *     por `/marketplace/{slug}`.
 *  2. La categoría sólo modifica bloques activos, CTA y validaciones.
 *     Nunca cambia arquitectura ni Studio.
 *  3. Los gates por plan consultan EXCLUSIVAMENTE el Catálogo Central
 *     de Planes (`@/lib/plans/plans-catalog`). Prohibido codificar
 *     límites o capacidades dentro de la plantilla.
 *  4. Todo bloque nuevo debe ser reutilizable, configurable,
 *     controlable por permisos y controlable por plan.
 *
 * El detalle del negocio se pasa por prop `business` o por contexto
 * `BusinessSurfaceContext` (que la ruta pública popula tras cargar la
 * empresa en el loader — patrón consistente con Region/Destination).
 */
/* eslint-disable react-refresh/only-export-components -- I3-B keeps the legacy contexts and pure category resolver in the authorized surface module. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PublicShell } from "@/components/discovery";
import { FavoriteButton } from "@/components/commerce/FavoriteButton";
import type { MarketplaceBusinessDetail } from "@/lib/catalog/marketplace-reads.functions";
import type { BusinessRelatedDTO } from "@/lib/catalog/business-related.functions";
import { planAllows } from "@/lib/plans/plans-catalog";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceSection } from "@/components/experience-builder/blocks/experience-section/ExperienceSection";
import { ExperienceInfoGrid } from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGrid";
import { ExperienceCtaBar } from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar";
import { registerStickyCta } from "@/lib/alux/sticky-cta-presence";
import { ExperienceProductsBlock } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import { ExperiencePromotionsBlock } from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotionsBlock";
import { ExperienceReviewsBlock } from "@/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import {
  businessToHeroDTO,
  businessToSubnavDTO,
  businessToDescriptionSectionDTO,
  businessToInfoGridDTO,
  businessToCtaBarDTO,
  businessToStayEssentialsDTO,
  businessToStayAmenitiesDTO,
  businessToStayPolicyDTO,
  businessToDiningEssentialsDTO,
  businessToDiningAmenitiesDTO,
  businessToDiningVisitDTO,
} from "@/lib/experience-builder/adapters/business-to-blocks";
import { BusinessLocationBlock } from "@/components/maps/BusinessLocationBlock";
import { Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareSheet } from "@/components/share/ShareSheet";
import { AluxContextChip } from "@/components/alux/AluxContextChip";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import {
  createBusinessSurfaceContract,
  type BusinessSurfaceContractInput,
} from "@/lib/omxds/surfaces/business-surface.contract";
import { adaptHotelSurfaceContract } from "@/lib/omxds/surfaces/hotel-surface.adapter";
import { adaptRestaurantSurfaceContract } from "@/lib/omxds/surfaces/restaurant-surface.adapter";
import { adaptVacationRentalSurfaceContract } from "@/lib/omxds/surfaces/vacation-rental-surface.adapter";
import {
  isOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
} from "@/lib/omxds/surfaces/surface-contract";
import {
  createBusinessPremiumSurfaceContract,
  type BusinessPremiumEligibilityResult,
} from "@/lib/omxds/surfaces/business-premium-surface.contract";
import { PremiumHero } from "@/components/premium";
import { BusinessLogo } from "@/components/common/BusinessLogo";
import { cn } from "@/lib/utils";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { DEFAULT_PREMIUM_PRESENTATION } from "@/lib/omxds/presentation/presentation";

/* ------------------------------------------------------------------ *
 * Contexto — poblado por la ruta pública (SSR-safe).
 * ------------------------------------------------------------------ */

export const BusinessSurfaceContext = createContext<MarketplaceBusinessDetail | null>(null);

/**
 * E2 · US-E2.1 — Contexto complementario para Related Collection.
 * Se mantiene independiente para no romper consumidores existentes
 * de `BusinessSurfaceContext` (Section/Reviews/Products/…).
 */
export const BusinessSurfaceRelatedContext = createContext<BusinessRelatedDTO | null>(null);

export function BusinessSurfaceProvider({
  business,
  related,
  children,
}: {
  business: MarketplaceBusinessDetail | null;
  related?: BusinessRelatedDTO | null;
  children: React.ReactNode;
}) {
  return (
    <BusinessSurfaceContext.Provider value={business}>
      <BusinessSurfaceRelatedContext.Provider value={related ?? null}>
        {children}
      </BusinessSurfaceRelatedContext.Provider>
    </BusinessSurfaceContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 * Variantes por categoría — sólo etiquetas y CTA. Sin nuevos bloques
 * duplicados. Añadir una categoría = añadir una entrada aquí.
 * ------------------------------------------------------------------ */

type CategoryVariant = {
  eyebrow: string;
  productsHeading: string;
  productsEmpty: string;
};

const CATEGORY_VARIANTS: Record<string, CategoryVariant> = {
  hotel: {
    eyebrow: "Hospedaje",
    productsHeading: "Habitaciones y experiencias",
    productsEmpty: "Sin habitaciones publicadas.",
  },
  hospedaje: {
    eyebrow: "Hospedaje",
    productsHeading: "Habitaciones y experiencias",
    productsEmpty: "Sin habitaciones publicadas.",
  },
  restaurante: {
    eyebrow: "Gastronomía",
    productsHeading: "Menú de la casa",
    productsEmpty: "Sin menú publicado.",
  },
  cafeteria: {
    eyebrow: "Gastronomía",
    productsHeading: "Menú",
    productsEmpty: "Sin menú publicado.",
  },
  cenote: {
    eyebrow: "Naturaleza",
    productsHeading: "Accesos y experiencias",
    productsEmpty: "Sin accesos publicados.",
  },
  museo: {
    eyebrow: "Cultura",
    productsHeading: "Entradas y visitas guiadas",
    productsEmpty: "Sin entradas publicadas.",
  },
  agencia: {
    eyebrow: "Operador",
    productsHeading: "Tours y paquetes",
    productsEmpty: "Sin tours publicados.",
  },
  tour: {
    eyebrow: "Experiencia",
    productsHeading: "Tours disponibles",
    productsEmpty: "Sin tours publicados.",
  },
  transporte: {
    eyebrow: "Transporte",
    productsHeading: "Rutas y traslados",
    productsEmpty: "Sin traslados publicados.",
  },
  tienda: {
    eyebrow: "Tienda",
    productsHeading: "Catálogo",
    productsEmpty: "Sin productos publicados.",
  },
  servicio: {
    eyebrow: "Servicio",
    productsHeading: "Servicios",
    productsEmpty: "Sin servicios publicados.",
  },
  "casas-de-vacaciones": {
    eyebrow: "Casa de vacaciones",
    productsHeading: "Estancias y servicios",
    productsEmpty: "Sin opciones de estancia publicadas.",
  },
  "casas-vacacionales": {
    eyebrow: "Casa de vacaciones",
    productsHeading: "Estancias y servicios",
    productsEmpty: "Sin opciones de estancia publicadas.",
  },
  villas: {
    eyebrow: "Villa",
    productsHeading: "Estancias y servicios",
    productsEmpty: "Sin opciones de estancia publicadas.",
  },
  /* Slugs reales declarados en el CMS (`business_categories.slug`). */
  restaurantes: {
    eyebrow: "Gastronomía",
    productsHeading: "Menú de la casa",
    productsEmpty: "Sin menú publicado.",
  },
  gastronomia: {
    eyebrow: "Gastronomía",
    productsHeading: "Menú de la casa",
    productsEmpty: "Sin menú publicado.",
  },
  hoteles: {
    eyebrow: "Hospedaje",
    productsHeading: "Habitaciones y experiencias",
    productsEmpty: "Sin habitaciones publicadas.",
  },
  cenotes: {
    eyebrow: "Naturaleza",
    productsHeading: "Accesos y experiencias",
    productsEmpty: "Sin accesos publicados.",
  },
  tours: {
    eyebrow: "Experiencia",
    productsHeading: "Tours disponibles",
    productsEmpty: "Sin tours publicados.",
  },
  experiencias: {
    eyebrow: "Experiencia",
    productsHeading: "Experiencias disponibles",
    productsEmpty: "Sin experiencias publicadas.",
  },
  "experiencias-tours": {
    eyebrow: "Experiencia",
    productsHeading: "Experiencias y tours",
    productsEmpty: "Sin experiencias publicadas.",
  },
  "servicios-turisticos": {
    eyebrow: "Servicio",
    productsHeading: "Servicios",
    productsEmpty: "Sin servicios publicados.",
  },
  artesanias: {
    eyebrow: "Tienda",
    productsHeading: "Catálogo",
    productsEmpty: "Sin productos publicados.",
  },
  naturaleza: {
    eyebrow: "Naturaleza",
    productsHeading: "Accesos y experiencias",
    productsEmpty: "Sin accesos publicados.",
  },
  cultura: {
    eyebrow: "Cultura",
    productsHeading: "Entradas y visitas guiadas",
    productsEmpty: "Sin entradas publicadas.",
  },
};

export function resolveBusinessVariant(categorySlug: string): CategoryVariant {
  return (
    CATEGORY_VARIANTS[categorySlug.trim().toLowerCase()] ?? {
      eyebrow: "Catálogo Oriente Maya",
      productsHeading: "Productos y experiencias",
      productsEmpty: "Sin productos publicados.",
    }
  );
}

type ApprovedBusinessFamily = "hotel" | "restaurant" | "vacation_rental";

const APPROVED_FAMILY_BY_CMS_KEY: Readonly<Record<string, ApprovedBusinessFamily>> = {
  hoteles: "hotel",
  restaurantes: "restaurant",
  "casas-de-vacaciones": "vacation_rental",
};

const APPROVED_FAMILY_BY_CATEGORY_SLUG: Readonly<Record<string, ApprovedBusinessFamily>> = {
  hotel: "hotel",
  hoteles: "hotel",
  hospedaje: "hotel",
  hospedajes: "hotel",
  alojamiento: "hotel",
  restaurante: "restaurant",
  restaurantes: "restaurant",
  restaurant: "restaurant",
  restaurants: "restaurant",
  cafeteria: "restaurant",
  cafeterias: "restaurant",
  "casa-de-vacaciones": "vacation_rental",
  "casas-de-vacaciones": "vacation_rental",
  "vacation-rental": "vacation_rental",
  "vacation-rentals": "vacation_rental",
  "renta-vacacional": "vacation_rental",
  "rentas-vacacionales": "vacation_rental",
};

export function resolveApprovedBusinessFamily(
  categoryFamilyKey: string | null | undefined,
  categorySlug: string,
  contractFamily?: string | null,
): ApprovedBusinessFamily | null {
  if (contractFamily === "hotel" || contractFamily === "restaurant") return contractFamily;

  const cmsFamily = categoryFamilyKey?.trim().toLowerCase();
  const familyFromCms = cmsFamily ? APPROVED_FAMILY_BY_CMS_KEY[cmsFamily] : undefined;
  if (familyFromCms) return familyFromCms;

  return APPROVED_FAMILY_BY_CATEGORY_SLUG[categorySlug.trim().toLowerCase()] ?? null;
}

/* ------------------------------------------------------------------ *
 * Surface
 * ------------------------------------------------------------------ */

import {
  BUSINESS_PREMIUM_COPY_DEFAULTS,
  fillBusinessCopy,
  type BusinessPremiumCopy,
} from "./business-premium-copy";

export interface BusinessSurfaceProps {
  /** Cuando falta, se lee del `BusinessSurfaceContext`. */
  business?: MarketplaceBusinessDetail | null;
  /** I3-B · contrato validado; ausente conserva exactamente el renderer vigente. */
  surfaceContract?: OmxdsSurfaceContract;
  /** I3-D · presentación Premium sólo después de elegibilidad SSR completa. */
  premiumEligibility?: BusinessPremiumEligibilityResult | null;
  /** Textos de sección editables desde el constructor. Fail-closed. */
  copy?: BusinessPremiumCopy;
}

function businessRelatedCount(related?: BusinessRelatedDTO | null): number {
  return (related?.sameCategory.length ?? 0) + (related?.sameDestinationOther.length ?? 0);
}

function businessToSurfaceContractInput(
  business: MarketplaceBusinessDetail,
  related?: BusinessRelatedDTO | null,
): BusinessSurfaceContractInput {
  return {
    id: business.id,
    slug: business.slug,
    displayName: business.display_name,
    destinationSlug: business.destination_slug,
    categorySlug: business.category_slug,
    coverUrl: business.cover_url ?? null,
    latitude: business.primary_location?.latitude ?? null,
    longitude: business.primary_location?.longitude ?? null,
    verified: business.verified,
    relatedCount: businessRelatedCount(related),
    publishedProductCount: business.products.length,
    publishedPromotionCount: business.promotions.length,
    publishedReviewCount: business.reviews?.count ?? 0,
  };
}

export interface BusinessSurfaceContractBoundaryProps extends BusinessSurfaceProps {
  enabled: boolean;
  legacy: ReactNode;
  related?: BusinessRelatedDTO | null;
}

export function BusinessSurfaceContractBoundary({
  enabled,
  legacy,
  business,
  related,
  premiumEligibility,
}: BusinessSurfaceContractBoundaryProps) {
  if (!enabled || !business) return legacy;

  const input = businessToSurfaceContractInput(business, related);
  // Lote 3C · corrección final — la familia declarada en CMS
  // (`business_categories.listing_family_key`) manda sobre cualquier slug.
  // Sólo cuando el CMS no la declara se conserva la heurística previa.
  const cmsFamily = business.category_family_key ?? null;
  const verticalContract = cmsFamily
    ? cmsFamily === "hoteles"
      ? adaptHotelSurfaceContract(input)
      : cmsFamily === "restaurantes"
        ? adaptRestaurantSurfaceContract(input)
        : cmsFamily === "casas-de-vacaciones"
          ? adaptVacationRentalSurfaceContract({ ...input, categorySlug: "casas-de-vacaciones" })
          : null
    : (adaptHotelSurfaceContract(input) ??
      adaptRestaurantSurfaceContract(input) ??
      adaptVacationRentalSurfaceContract(input));

  if (verticalContract)
    return (
      <BusinessSurface
        business={business}
        surfaceContract={verticalContract}
        premiumEligibility={premiumEligibility}
      />
    );

  const premiumResolution = premiumEligibility
    ? createBusinessPremiumSurfaceContract(input, premiumEligibility)
    : null;
  if (premiumResolution)
    return (
      <BusinessSurface
        business={business}
        surfaceContract={premiumResolution.contract}
        premiumEligibility={premiumResolution.eligibility}
      />
    );

  const surfaceContract = createBusinessSurfaceContract(input);
  if (!surfaceContract) return legacy;

  return <BusinessSurface business={business} surfaceContract={surfaceContract} />;
}

export function BusinessSurface({
  business: propBusiness,
  surfaceContract,
  premiumEligibility,
  copy = BUSINESS_PREMIUM_COPY_DEFAULTS,
}: BusinessSurfaceProps = {}) {
  const ctxBusiness = useContext(BusinessSurfaceContext);
  const sourceBusiness = propBusiness ?? ctxBusiness;
  const related = useContext(BusinessSurfaceRelatedContext);

  if (!sourceBusiness) {
    return (
      <PublicShell
        title="Empresa no disponible"
        crumbs={[{ label: "Catálogo", to: "/oriente-maya" }, { label: "—" }]}
      >
        <p className="text-sm text-muted-foreground">Aún no publicamos esta empresa.</p>
      </PublicShell>
    );
  }

  const activeContract =
    surfaceContract &&
    isOmxdsSurfaceContract(surfaceContract) &&
    ["business", "hotel", "restaurant"].includes(surfaceContract.family)
      ? surfaceContract
      : null;
  const activePremium =
    activeContract &&
    ["business", "hotel", "restaurant"].includes(activeContract.family) &&
    premiumEligibility?.eligible
      ? premiumEligibility
      : null;
  // La familia visual aprobada y la elegibilidad comercial son autoridades
  // distintas. Una ficha Hotel/Restaurante/Casa de vacaciones conserva su
  // composición Premium editorial aunque sea demo o todavía no acredite
  // medios/capacidades comerciales. La elegibilidad sólo habilita los datos
  // Premium acreditados (galería, contacto y modo cinematográfico).
  // El preview CMS puede llegar deliberadamente sin `surfaceContract`.
  // La familia declarada en sus propios datos sigue siendo autoridad visual;
  // el contrato sólo gobierna capacidades, acciones y omisiones.
  const approvedFamily = resolveApprovedBusinessFamily(
    sourceBusiness.category_family_key,
    sourceBusiness.category_slug,
    activeContract?.family,
  );
  const usesApprovedFamilyTemplate = approvedFamily !== null;

  const b: MarketplaceBusinessDetail = activePremium
    ? {
        ...sourceBusiness,
        cover_url: activePremium.cover?.url ?? null,
        primary_location: activePremium.location
          ? {
              label: null,
              address_line1: activePremium.location.addressLine1,
              address_line2: activePremium.location.addressLine2,
              latitude: activePremium.location.latitude,
              longitude: activePremium.location.longitude,
            }
          : null,
        primary_contact: activePremium.contact,
      }
    : sourceBusiness;
  const variant = resolveBusinessVariant(b.category_slug);
  const tier = b.plan_tier;
  const showPromotions =
    planAllows(tier, "promotions") &&
    b.promotions.length > 0 &&
    !activeContract?.omissions.includes("offer");

  // H-03 · Ola I2.d — Refactor final: BusinessSurface es orquestador
  // puro. Cero JSX visual propio. Toda la presentación proviene
  // exclusivamente de bloques oficiales del Experience Builder.
  // Responsabilidades restantes: proveer contexto (BusinessSurfaceProvider),
  // adaptar datos (adapters), y componer la secuencia declarativa de
  // bloques + anchors que la sub-navegación necesita.
  const heroDto = businessToHeroDTO(b);
  const subnavDto = businessToSubnavDTO(b);
  /* Contacto acreditado: dato Premium cuando existe y, si no, el contacto
     público ya publicado en el CMS. Autoridad única para la sección
     `#contacto`, su ancla en la sub-navegación y la acción "Contactar". */
  const contactSource = activePremium?.contact ?? b.primary_contact ?? null;
  /* Enlaces territoriales sólo cuando el slug real existe: nunca se emite
     una URL con segmento vacío desde una ficha. */
  const destinationHref = b.destination_slug
    ? `/oriente-maya/${encodeURIComponent(b.destination_slug)}`
    : null;
  const categoryHref =
    destinationHref && b.category_slug
      ? `${destinationHref}/${encodeURIComponent(b.category_slug)}`
      : null;
  const hasLocation = b.primary_location?.latitude != null && b.primary_location?.longitude != null;
  const hasGalleryMedia = Boolean(activePremium) || (b.media ?? []).length >= 2;
  const isVacationRental = approvedFamily === "vacation_rental";
  /* Hospedaje (hotel y casa de vacaciones) comparten la misma composición
     editorial de alojamiento sobre la plantilla madre: fotografía primero,
     tarifa orientativa "desde", datos de estancia y Mi Viaje como acción.
     Ninguna de las dos familias ofrece reserva ni cobro en línea. */
  const isLodging = isVacationRental || approvedFamily === "hotel";
  /* Restaurante: misma composición editorial (fotografía primero, precio
     orientativo del menú, datos escaneables y Mi Viaje como acción). Tampoco
     hay reserva ni cobro en línea. */
  const isDining = approvedFamily === "restaurant";
  /* Familias con composición editorial de ficha completa. */
  const isImmersive = isLodging || isDining;
  const priceUnitLabel = isLodging ? "por noche" : "por platillo";
  const priceOwnerLabel = isVacationRental ? "el anfitrión" : isDining ? "el restaurante" : "el hotel";
  /* Casa de vacaciones con una sola tarifa publicada: la tarifa vive en el
     bloque de estancia y no se repite como tarjeta genérica de producto. */
  const hidesGenericOffer =
    isVacationRental &&
    (b.products ?? []).length <= 1 &&
    (b.products ?? []).some((p) => typeof p.price_amount === "number" && p.price_amount > 0);
  const hasRelated = Boolean(
    related && (related.sameCategory.length > 0 || related.sameDestinationOther.length > 0),
  );
  const effectiveSubnavDto = {
    ...subnavDto,
    anchors: subnavDto.anchors.filter((anchor) => {
      // Ningún ancla visible puede apuntar a una sección que no se renderiza.
      if (anchor.id === "contacto" && !contactSource) return false;
      if (anchor.id === "galeria" && !hasGalleryMedia) return false;
      if (anchor.id === "ubicacion" && !hasLocation) return false;
      if (anchor.id === "descubre" && !hasRelated) return false;
      if (anchor.id === "promociones" && !showPromotions) return false;
      if (anchor.id === "servicios" && hidesGenericOffer) return false;
      if (!activeContract) return true;
      if (
        activeContract.omissions.includes("offer") &&
        ["servicios", "promociones"].includes(anchor.id)
      )
        return false;
      if (activeContract.omissions.includes("media") && anchor.id === "galeria") return false;
      if (activeContract.omissions.includes("map") && anchor.id === "ubicacion") return false;
      if (activeContract.omissions.includes("reputation") && anchor.id === "resenas") return false;
      if (activeContract.omissions.includes("collection") && anchor.id === "descubre") return false;
      return true;
    }),
  };
  const descriptionSection = businessToDescriptionSectionDTO(b);
  const infoGridDto = businessToInfoGridDTO(b);
  const legacyCtaBarDto = businessToCtaBarDTO(b);
  const dominantAction = activeContract?.actions.find((action) => action.role === "dominant");
  const ctaBarDto = activeContract
    ? {
        ...legacyCtaBarDto,
        // La ficha Premium integra la acción al flujo editorial. Una barra
        // fija ocultaba el contenido en iPad/móvil y mezclaba la composición
        // aprobada con el patrón comercial heredado.
        variant: usesApprovedFamilyTemplate ? ("inline" as const) : legacyCtaBarDto.variant,
        actions: dominantAction?.href
          ? [
              {
                label: dominantAction.label,
                action: "contact" as const,
                href: dominantAction.href,
                emphasis: "primary" as const,
              },
            ]
          : [],
      }
    : {
        ...legacyCtaBarDto,
        // Sin contacto acreditado no se muestra una acción sin destino.
        actions: contactSource ? legacyCtaBarDto.actions : [],
      };
  const premiumGalleryDto = activePremium
    ? {
        variant: "mosaic" as const,
        heading: fillBusinessCopy(copy.galleryHeading, b.display_name),
        subheading: null,
        items: [activePremium.cover, ...activePremium.gallery]
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .map((item) => ({
            kind: "image" as const,
            url: item.url,
            alt: item.alt,
            ...(item.caption ? { caption: item.caption } : {}),
            width: item.width,
            height: item.height,
          })),
        maxVisible: 9,
        aspect: "landscape" as const,
        ariaLabel: `Galería de ${b.display_name}`,
        capabilities: {
          lightbox: true,
          captions: true,
          video: false,
          panorama360: false,
          model3d: false,
          ar: false,
          ugc: false,
        },
      }
    : null;
  /* Sin composición Premium activa, la ficha conserva su galería editorial a
     partir de las fotografías publicadas en CMS (`business_media`). Sin
     fotografías no se renderiza nada: jamás se inventan medios. */
  /* El logotipo es identidad de marca, no fotografía de la ficha: se muestra
     junto al nombre y queda fuera del mosaico editorial. */
  const businessLogoUrl = (b.media ?? []).find((m) => m.role === "logo" && m.url)?.url ?? null;
  const cmsGalleryItems = (b.media ?? [])
    .filter((m) => Boolean(m.url) && m.role !== "logo")
    .map((m) => ({
      kind: "image" as const,
      url: m.url,
      alt: m.alt || b.display_name,
    }));
  const galleryDto =
    premiumGalleryDto ??
    (cmsGalleryItems.length >= 2
      ? {
          variant: "mosaic" as const,
          heading: fillBusinessCopy(copy.galleryHeading, b.display_name),
          subheading: null,
          items: cmsGalleryItems,
          maxVisible: 5,
          aspect: "landscape" as const,
          ariaLabel: `Galería de ${b.display_name}`,
          capabilities: {
            lightbox: true,
            captions: false,
            video: false,
            panorama360: false,
            model3d: false,
            ar: false,
            ugc: false,
          },
        }
      : null);
  const premiumContactDto = contactSource
    ? {
        variant: "cards" as const,
        heading: copy.contactHeading,
        columns: 1,
        items: [
          {
            iconKey: "message-circle",
            label: contactSource.label || "Contacto público",
            value: contactSource.value,
            tone: "default" as const,
          },
        ],
        ariaLabel: `Contacto de ${b.display_name}`,
        capabilities: { copyable: true, livePricing: false, liveAvailability: false },
      }
    : null;
  const descriptionBeforeGallery = false;
  /* Hospedaje y restaurante: composición editorial propia de la familia
     sobre los mismos bloques oficiales. Sin ejes administrables capturados,
     cada sección simplemente no se renderiza. */
  const stayEssentialsDto = isLodging
    ? businessToStayEssentialsDTO(b)
    : isDining
      ? businessToDiningEssentialsDTO(b)
      : null;
  const stayAmenitiesDto = isLodging
    ? businessToStayAmenitiesDTO(b)
    : isDining
      ? businessToDiningAmenitiesDTO(b)
      : null;
  const stayPolicyDto = isLodging
    ? businessToStayPolicyDTO(b)
    : isDining
      ? businessToDiningVisitDTO(b)
      : null;
  /* Precio orientativo "desde": se toma exclusivamente del catálogo publicado
     en CMS (`products.price_amount`). Sin precio real no se renderiza nada y
     nunca se ofrece cobro ni reservación en línea: la acción es Mi Viaje. */
  const stayFromPrice = (() => {
    if (!isImmersive) return null;
    const priced = (b.products ?? []).filter(
      (p) => typeof p.price_amount === "number" && (p.price_amount as number) > 0,
    );
    if (priced.length === 0) return null;
    const cheapest = priced.reduce((min, p) =>
      (p.price_amount as number) < (min.price_amount as number) ? p : min,
    );
    return {
      amount: cheapest.price_amount as number,
      currency: cheapest.price_currency || "MXN",
    };
  })();
  /* Resumen escaneable de la estancia: sólo ejes administrables con valor
     real en CMS; sin dato capturado la línea simplemente no se muestra. */
  const stayHighlightLine = (() => {
    if (!isImmersive) return null;
    const resolved = b.attributes ?? [];
    const parts = (
      isVacationRental
        ? ["capacity", "bedrooms", "beds", "bathrooms"]
        : isDining
          ? ["cuisine_type", "dining_experience", "price_level"]
          : ["hotel_type", "zone", "price_level"]
    )
      .map((key) => resolved.find((item) => item.key === key))
      .filter((attribute): attribute is NonNullable<typeof attribute> =>
        Boolean(attribute && attribute.values.length > 0),
      )
      .map((attribute) => {
        const value = attribute.values.map((item) => item.label).join(" · ");
        const label = attribute.label.toLowerCase();
        /* El valor administrable suele venir ya redactado ("3 dormitorios",
           "5–6 huéspedes"). Sólo se añade la etiqueta del catálogo cuando el
           valor es puramente numérico y quedaría sin contexto. */
        const numericOnly = /^[\d\s.,/–-]+$/.test(value);
        return numericOnly ? `${value} ${label}` : value;
      });
    return parts.length > 0 ? parts.join(" · ") : null;
  })();
  const stayFromPriceLabel = stayFromPrice
    ? new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: stayFromPrice.currency,
        maximumFractionDigits: 0,
      }).format(stayFromPrice.amount)
    : null;

  return (
    <PublicShell
      crumbs={[{ label: "Catálogo", to: "/oriente-maya" }, { label: b.display_name }]}
      useContextCrumbs
      compactCrumbsOnMobile
    >
      {usesApprovedFamilyTemplate ? (
        <>
          <PremiumHero
            layout="entity"
            vm={{
              presentation: DEFAULT_PREMIUM_PRESENTATION,
              // D-03 · La ruta territorial navegable la emite PublicShell.
              // El Hero no repite el breadcrumb decorativo.
              eyebrow: variant.eyebrow,
              title: b.display_name,
              description: b.tagline || undefined,
              media: activePremium?.cover
                ? {
                    url: activePremium.cover.url,
                    alt: activePremium.cover.alt,
                  }
                : b.cover_url
                  ? {
                      url: b.cover_url,
                      alt: b.display_name,
                    }
                  : null,
              badges: b.verified ? [{ label: "Empresa verificada", tone: "success" }] : [],
            }}
          />
          <div
            className={cn(
              "mx-auto mt-4 flex w-full max-w-7xl flex-wrap items-center gap-2 px-5 sm:px-8 lg:px-12",
              businessLogoUrl ? "justify-between" : "justify-end",
            )}
          >
            {businessLogoUrl ? (
              <span className="flex min-w-0 items-center gap-3">
                <BusinessLogo url={businessLogoUrl} businessName={b.display_name} size="md" />
                <span className="truncate text-sm font-semibold">{b.display_name}</span>
              </span>
            ) : null}
            <span className="flex flex-wrap items-center justify-end gap-2">
            <ShareButton title={b.display_name} />
            <FavoriteButton entityKind="business" entityId={b.id} />
            <AddToTravelPlanButton
              kind="business"
              targetId={b.id}
              title={b.display_name}
              slug={b.slug}
              {...(b.destination_slug ? { subtitle: b.destination_slug } : {})}
            />
            </span>
          </div>
        </>
      ) : (
        <ExperienceHero
          dto={heroDto}
          headingLevel="h1"
          headerActionsSlot={null}
          extensionsSlot={null}
        />
      )}

      {usesApprovedFamilyTemplate ? null : (
        <div className="mx-auto mt-4 flex w-full max-w-7xl flex-wrap justify-end gap-2 px-5 sm:px-8 lg:px-12">
          <ShareButton title={b.display_name} />
          <FavoriteButton entityKind="business" entityId={b.id} />
          <AddToTravelPlanButton
            kind="business"
            targetId={b.id}
            title={b.display_name}
            slug={b.slug}
            {...(b.destination_slug ? { subtitle: b.destination_slug } : {})}
          />
        </div>
      )}

      <TourismAluxPanel
        className="mx-auto mt-4 w-full max-w-7xl"
        title={fillBusinessCopy(copy.aluxTitle, b.display_name)}
        description={copy.aluxDescription}
        task={`Ayúdame a integrar ${b.display_name} en mi viaje por el Oriente Maya.`}
        selection={{
          entityRef: `business:${b.id}`,
          title: b.display_name,
          ...(b.destination_slug ? { destinationSlug: b.destination_slug } : {}),
          ...(b.destination_slug ? { destinationLabel: b.destination_slug } : {}),
          ...(b.category_slug ? { familySlug: b.category_slug } : {}),
        }}
      />

      <AluxContextChip
        businessId={b.id}
        businessSlug={b.slug}
        businessName={b.display_name}
        latitude={b.primary_location?.latitude ?? b.latitude ?? null}
        longitude={b.primary_location?.longitude ?? b.longitude ?? null}
      />

      {/* Casa de vacaciones: la fotografía encabeza la lectura, como en las
          fichas de alojamiento de referencia, antes de los datos. */}
      {isImmersive && galleryDto ? (
        <section id="galeria" data-eb-anchor className="mt-6 scroll-mt-24">
          <ExperienceGallery dto={galleryDto} />
        </section>
      ) : null}

      {isImmersive && stayFromPriceLabel ? (
        <section
          data-eb-anchor
          className="mx-auto mt-6 w-full max-w-7xl px-5 sm:px-8 lg:px-12"
          aria-label="Tarifa orientativa"
        >
          <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  <span className="text-base font-normal text-muted-foreground">Desde </span>
                  {stayFromPriceLabel}{" "}
                  <span className="text-base font-normal text-muted-foreground">{priceUnitLabel}</span>
                </p>
                {stayHighlightLine ? (
                  <p className="mt-2 text-sm text-muted-foreground">{stayHighlightLine}</p>
                ) : null}
                {b.reviews && b.reviews.count > 0 ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                    <Star className="h-4 w-4 shrink-0 fill-current text-primary" aria-hidden />
                    <span className="font-medium">{b.reviews.average.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      · {b.reviews.count} {b.reviews.count === 1 ? "reseña" : "reseñas"}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col lg:min-w-[15rem]">
                <AddToTravelPlanButton
                  kind="business"
                  targetId={b.id}
                  title={b.display_name}
                  slug={b.slug}
                  {...(b.destination_slug ? { subtitle: b.destination_slug } : {})}
                />
                <div className="flex gap-2">
                  <FavoriteButton entityKind="business" entityId={b.id} />
                  <ShareButton title={b.display_name} />
                </div>
              </div>
            </div>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Tarifa orientativa publicada por {priceOwnerLabel}. Sin cobro ni reservación en
              línea.
            </p>
          </div>
        </section>
      ) : null}

      {/* Móvil: barra inferior persistente con la tarifa orientativa y la
          acción principal de la ficha. No hay reserva ni cobro en línea. */}
      {isImmersive && stayFromPriceLabel ? (
        <>
          <MobileStickyCtaRegistrar />
          <div aria-hidden className="h-24 lg:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 py-3 shadow-floating backdrop-blur lg:hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  <span className="font-normal text-muted-foreground">Desde </span>
                  {stayFromPriceLabel}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {priceUnitLabel} · sin cobro en línea
                </p>
              </div>
              <div className="shrink-0">
                <AddToTravelPlanButton
                  kind="business"
                  targetId={b.id}
                  title={b.display_name}
                  slug={b.slug}
                  {...(b.destination_slug ? { subtitle: b.destination_slug } : {})}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ExperienceSubnav dto={effectiveSubnavDto} className="mt-6 mb-6" />

      {isImmersive ? (
        stayEssentialsDto || descriptionSection ? (
          <section id="resumen" data-eb-anchor className="scroll-mt-24">
            {stayEssentialsDto ? <ExperienceInfoGrid dto={stayEssentialsDto} /> : null}
            {descriptionSection ? (
              <ExperienceSection dto={descriptionSection} className="mt-8" />
            ) : null}
          </section>
        ) : null
      ) : descriptionBeforeGallery && descriptionSection ? (
        <section id="resumen" data-eb-anchor className="scroll-mt-24">
          <ExperienceSection dto={descriptionSection} />
          {infoGridDto ? <ExperienceInfoGrid dto={infoGridDto} className="mt-6" /> : null}
        </section>
      ) : infoGridDto ? (
        <section id="resumen" data-eb-anchor className="scroll-mt-24">
          <ExperienceInfoGrid dto={infoGridDto} />
        </section>
      ) : null}

      {!isImmersive && galleryDto ? (
        <section id="galeria" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceGallery dto={galleryDto} />
        </section>
      ) : null}

      {!isImmersive && !descriptionBeforeGallery && descriptionSection ? (
        <section data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceSection dto={descriptionSection} />
        </section>
      ) : null}

      {stayAmenitiesDto ? (
        <section data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceInfoGrid dto={stayAmenitiesDto} />
        </section>
      ) : null}

      {stayPolicyDto ? (
        <section data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceInfoGrid dto={stayPolicyDto} />
        </section>
      ) : null}

      {/* Casa de vacaciones: si la única tarifa publicada ya se presenta en el
          bloque de estancia, no se repite la tarjeta genérica de producto.
          Con dos o más servicios publicados el catálogo se mantiene. */}
      {!activeContract?.omissions.includes("offer") &&
      !hidesGenericOffer ? (
        <section id="servicios" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceProductsBlock
            config={{
              source: "business",
              /* Hospedaje: una sola fila horizontal deslizable con
                 habitaciones compactas. */
              variant: isImmersive ? "carousel" : "grid",
              heading: variant.productsHeading,
              emptyMessage: variant.productsEmpty,
              columns: isImmersive ? 3 : 2,
              capabilities: { compact: isImmersive },
            }}

          />
        </section>
      ) : null}

      {showPromotions ? (
        <section id="promociones" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperiencePromotionsBlock
            config={{
              source: "business",
              variant: "grid",
              heading: copy.promotionsHeading,
              columns: 2,
            }}
          />
        </section>
      ) : null}

      {!activeContract?.omissions.includes("map") &&
      b.primary_location?.latitude != null &&
      b.primary_location?.longitude != null ? (
        <section id="ubicacion" data-eb-anchor className="mt-10 scroll-mt-24">
          <BusinessLocationBlock
            lat={b.primary_location.latitude}
            lng={b.primary_location.longitude}
            name={b.display_name}
            addressLine1={b.primary_location.address_line1}
            addressLine2={b.primary_location.address_line2}
            presentation={usesApprovedFamilyTemplate ? "premium" : "standard"}
            layout={usesApprovedFamilyTemplate ? "stacked" : "split"}
          />
        </section>
      ) : null}

      {!activeContract?.omissions.includes("reputation") ? (
        <section id="resenas" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceReviewsBlock
            config={{
              source: "business",
              variant: "list",
              heading: copy.reviewsHeading,
              emptyMessage: copy.reviewsEmpty,
            }}
          />
        </section>
      ) : null}

      {related &&
      !activeContract?.omissions.includes("collection") &&
      (related.sameCategory.length > 0 || related.sameDestinationOther.length > 0) ? (
        <section id="descubre" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceRelatedCollectionBlock
            config={{
              source: "business",
              entityKind: "mixed",
              variant: usesApprovedFamilyTemplate ? "carousel" : "grid",
              columns: usesApprovedFamilyTemplate ? 4 : 2,
              density: usesApprovedFamilyTemplate ? "compact" : "comfortable",
              heading: usesApprovedFamilyTemplate
                ? fillBusinessCopy(copy.relatedHeading, b.display_name)
                : "Sigue descubriendo",
              subheading: usesApprovedFamilyTemplate
                ? copy.relatedSubheading
                : `Otras opciones en ${b.destination_slug || "el destino"} para continuar armando tu viaje.`,
              emptyMessage: "Aún no hay empresas hermanas publicadas en este destino.",
              ariaLabel: `Descubrimiento contextual desde ${b.display_name}`,
              groups: usesApprovedFamilyTemplate
                ? [
                    {
                      id: "cerca-del-perfil",
                      entityKind: "business",
                      maxItems: 4,
                      variant: "carousel",
                      // Sólo enlazamos cuando el destino real existe: nunca
                      // se emite una URL con segmento vacío.
                      ...(destinationHref
                        ? { seeAllHref: destinationHref, seeAllLabel: "Ver destino" }
                        : {}),
                    },
                  ]
                : [
                    {
                      id: "misma-categoria",
                      entityKind: "business",
                      heading: `Más de ${variant.eyebrow.toLowerCase()} en el destino`,
                      maxItems: 6,
                      variant: "grid",
                      categorySlug: b.category_slug || null,
                      ...(categoryHref
                        ? { seeAllHref: categoryHref, seeAllLabel: "Ver todas" }
                        : {}),
                    },
                    {
                      id: "otras-categorias",
                      entityKind: "business",
                      heading: "Otras experiencias del destino",
                      maxItems: 6,
                      variant: "grid",
                      ...(destinationHref
                        ? { seeAllHref: destinationHref, seeAllLabel: "Ver destino" }
                        : {}),
                    },
                  ],
              capabilities: {
                showImage: true,
                showMeta: true,
                showBadges: true,
                showKindBadge: true,
                dedupe: true,
                showRationale: !usesApprovedFamilyTemplate,
                compact: usesApprovedFamilyTemplate,
              },
              contextRefs: {
                destinationSlug: b.destination_slug || null,
                categorySlug: b.category_slug || null,
                businessSlug: b.slug || null,
              },
            }}
          />
        </section>
      ) : null}

      {premiumContactDto ? (
        <section id="contacto" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceInfoGrid dto={premiumContactDto} />
        </section>
      ) : null}

      {/* Casas de vacaciones no ofrecen reserva ni cobro en línea: la acción
          final invita a sumar el hospedaje a Mi Viaje para que el concierge
          arme el itinerario completo. */}
      {isImmersive ? (
        <section className="mx-auto mt-10 w-full max-w-7xl px-5 pb-4 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground">
                {fillBusinessCopy(copy.ctaTitle, b.display_name)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{copy.ctaSubtitle}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <AddToTravelPlanButton
                kind="business"
                targetId={b.id}
                title={b.display_name}
                slug={b.slug}
                {...(b.destination_slug ? { subtitle: b.destination_slug } : {})}
              />
              <ShareButton title={b.display_name} />
            </div>
          </div>
        </section>
      ) : (
        <ExperienceCtaBar dto={ctaBarDto} />
      )}
    </PublicShell>
  );
}

/**
 * ShareButton — botón de compartir compacto (Web Share API + fallback a
 * clipboard). Se usa en el overlay del Hero "gallery".
 */
function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Compartir perfil"
        className="rounded-pill border border-border bg-background shadow-soft"
      >
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </Button>
      <ShareSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        url={typeof window !== "undefined" ? window.location.href : ""}
        text="Descubre este perfil en el Oriente Maya."
        heading="Compartir perfil"
      />
    </>
  );
}

/**
 * MobileStickyCtaRegistrar — registra la barra inferior móvil de la ficha
 * (tarifa + Agregar a Mi Viaje) en el canal de presencia de CTAs stickies,
 * para que el dock flotante de Mi Viaje y Alux se eleven sobre ella sin
 * solaparse. Patrón idéntico al de `ExperienceCtaBar`.
 */
function MobileStickyCtaRegistrar() {
  useEffect(() => {
    const release = registerStickyCta();
    return release;
  }, []);
  return null;
}
