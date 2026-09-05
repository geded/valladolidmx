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
import { createContext, useContext, type ReactNode } from "react";
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
} from "@/lib/experience-builder/adapters/business-to-blocks";
import { BusinessLocationBlock } from "@/components/maps/BusinessLocationBlock";
import { Share2 } from "lucide-react";
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
    productsHeading: "Menú y reservaciones",
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
};

export function resolveBusinessVariant(categorySlug: string): CategoryVariant {
  return (
    CATEGORY_VARIANTS[categorySlug] ?? {
      eyebrow: "Catálogo Oriente Maya",
      productsHeading: "Productos y experiencias",
      productsEmpty: "Sin productos publicados.",
    }
  );
}

/* ------------------------------------------------------------------ *
 * Surface
 * ------------------------------------------------------------------ */

export interface BusinessSurfaceProps {
  /** Cuando falta, se lee del `BusinessSurfaceContext`. */
  business?: MarketplaceBusinessDetail | null;
  /** I3-B · contrato validado; ausente conserva exactamente el renderer vigente. */
  surfaceContract?: OmxdsSurfaceContract;
  /** I3-D · presentación Premium sólo después de elegibilidad SSR completa. */
  premiumEligibility?: BusinessPremiumEligibilityResult | null;
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
    !activeContract && planAllows(tier, "promotions") && b.promotions.length > 0;

  // H-03 · Ola I2.d — Refactor final: BusinessSurface es orquestador
  // puro. Cero JSX visual propio. Toda la presentación proviene
  // exclusivamente de bloques oficiales del Experience Builder.
  // Responsabilidades restantes: proveer contexto (BusinessSurfaceProvider),
  // adaptar datos (adapters), y componer la secuencia declarativa de
  // bloques + anchors que la sub-navegación necesita.
  const heroDto = businessToHeroDTO(b);
  const subnavDto = businessToSubnavDTO(b);
  const effectiveSubnavDto = activeContract
    ? {
        ...subnavDto,
        anchors: subnavDto.anchors.filter((anchor) => {
          if (
            activeContract.omissions.includes("offer") &&
            ["servicios", "promociones"].includes(anchor.id)
          )
            return false;
          if (activeContract.omissions.includes("media") && anchor.id === "galeria") return false;
          if (activeContract.omissions.includes("map") && anchor.id === "ubicacion") return false;
          if (activeContract.omissions.includes("reputation") && anchor.id === "opiniones")
            return false;
          if (activeContract.omissions.includes("collection") && anchor.id === "descubre")
            return false;
          return true;
        }),
      }
    : subnavDto;
  const descriptionSection = businessToDescriptionSectionDTO(b);
  const infoGridDto = businessToInfoGridDTO(b);
  const legacyCtaBarDto = businessToCtaBarDTO(b);
  const dominantAction = activeContract?.actions.find((action) => action.role === "dominant");
  const ctaBarDto = activeContract
    ? {
        ...legacyCtaBarDto,
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
    : legacyCtaBarDto;
  const premiumGalleryDto = activePremium
    ? {
        variant: "mosaic" as const,
        heading: `Conoce ${b.display_name}`,
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
  const premiumContactDto = activePremium?.contact
    ? {
        variant: "cards" as const,
        heading: "Contacto",
        columns: 1,
        items: [
          {
            iconKey: "message-circle",
            label: activePremium.contact.label || "Contacto público",
            value: activePremium.contact.value,
            tone: "default" as const,
          },
        ],
        ariaLabel: `Contacto de ${b.display_name}`,
        capabilities: { copyable: true, livePricing: false, liveAvailability: false },
      }
    : null;

  return (
    <PublicShell
      crumbs={[{ label: "Catálogo", to: "/oriente-maya" }, { label: b.display_name }]}
      useContextCrumbs
      compactCrumbsOnMobile
    >
      {activePremium ? (
        <>
          <PremiumHero
            vm={{
              presentation: DEFAULT_PREMIUM_PRESENTATION,
              // D-03 · La ruta territorial navegable la emite PublicShell.
              // El Hero no repite el breadcrumb decorativo.
              eyebrow: variant.eyebrow,
              title: b.display_name,
              description: b.tagline || undefined,
              media: activePremium.cover
                ? {
                    url: activePremium.cover.url,
                    alt: activePremium.cover.alt,
                  }
                : null,
              badges: b.verified ? [{ label: "Empresa verificada", tone: "success" }] : [],
            }}
          />
          <div className="mx-auto mt-4 flex w-full max-w-7xl justify-end gap-2 px-5 sm:px-8 lg:px-12">
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
        </>
      ) : (
        <ExperienceHero
          dto={heroDto}
          headingLevel="h1"
          headerActionsSlot={null}
          extensionsSlot={null}
        />
      )}

      {activePremium ? null : (
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
        title={`Planear con ${b.display_name}`}
        description="Alux te ayuda a integrar esta opción en tu viaje por el Oriente Maya."
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

      <ExperienceSubnav dto={effectiveSubnavDto} className="mt-6 mb-6" />

      {descriptionSection || infoGridDto ? (
        <section id="resumen" data-eb-anchor className="scroll-mt-24">
          {descriptionSection ? <ExperienceSection dto={descriptionSection} /> : null}
          {infoGridDto ? <ExperienceInfoGrid dto={infoGridDto} className="mt-6" /> : null}
        </section>
      ) : null}

      {premiumGalleryDto ? (
        <section id="galeria" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceGallery dto={premiumGalleryDto} />
        </section>
      ) : null}

      {!activeContract?.omissions.includes("offer") ? (
        <section id="servicios" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceProductsBlock
            config={{
              source: "business",
              variant: "grid",
              heading: variant.productsHeading,
              emptyMessage: variant.productsEmpty,
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
          />
        </section>
      ) : null}

      {showPromotions ? (
        <section id="promociones" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperiencePromotionsBlock
            config={{
              source: "business",
              variant: "grid",
              heading: "Promociones vigentes",
              columns: 2,
            }}
          />
        </section>
      ) : null}

      {!activeContract?.omissions.includes("reputation") ? (
        <section id="opiniones" data-eb-anchor className="mt-10 scroll-mt-24">
          <ExperienceReviewsBlock
            config={{
              source: "business",
              variant: "list",
              heading: "Opiniones de viajeros",
              emptyMessage:
                "Aún no hay reseñas publicadas de esta empresa. Sé la primera persona en compartir tu experiencia.",
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
              variant: "grid",
              columns: 2,
              heading: "Sigue descubriendo",
              subheading: `Otras opciones en ${b.destination_slug || "el destino"} para continuar armando tu viaje.`,
              emptyMessage: "Aún no hay empresas hermanas publicadas en este destino.",
              ariaLabel: `Descubrimiento contextual desde ${b.display_name}`,
              groups: [
                {
                  id: "misma-categoria",
                  entityKind: "business",
                  heading: `Más de ${variant.eyebrow.toLowerCase()} en el destino`,
                  maxItems: 6,
                  variant: "grid",
                  categorySlug: b.category_slug || null,
                  seeAllHref: `/oriente-maya/${encodeURIComponent(b.destination_slug || "")}/${encodeURIComponent(b.category_slug || "")}`,
                  seeAllLabel: "Ver todas",
                },
                {
                  id: "otras-categorias",
                  entityKind: "business",
                  heading: "Otras experiencias del destino",
                  maxItems: 6,
                  variant: "grid",
                  seeAllHref: `/oriente-maya/${encodeURIComponent(b.destination_slug || "")}`,
                  seeAllLabel: "Ver destino",
                },
              ],
              capabilities: {
                showImage: true,
                showMeta: true,
                showBadges: true,
                showKindBadge: true,
                dedupe: true,
                showRationale: true,
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

      <ExperienceCtaBar dto={ctaBarDto} />
    </PublicShell>
  );
}

/**
 * ShareButton — botón de compartir compacto (Web Share API + fallback a
 * clipboard). Se usa en el overlay del Hero "gallery".
 */
function ShareButton({ title }: { title: string }) {
  async function handleShare() {
    if (typeof navigator === "undefined") return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* usuario canceló */
    }
  }
  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Compartir"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-sm transition hover:bg-background focus-visible:outline-none focus-visible:ring-focus"
    >
      <Share2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
