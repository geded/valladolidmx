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
import { createContext, useContext } from "react";
import { PublicShell } from "@/components/discovery";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";
import type { MarketplaceBusinessDetail } from "@/lib/marketplace/marketplace-reads.functions";
import { planAllows } from "@/lib/plans/plans-catalog";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceSection } from "@/components/experience-builder/blocks/experience-section/ExperienceSection";
import { ExperienceInfoGrid } from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGrid";
import { ExperienceCtaBar } from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar";
import { ExperienceProductsBlock } from "@/components/experience-builder/blocks/experience-products/ExperienceProductsBlock";
import { ExperiencePromotionsBlock } from "@/components/experience-builder/blocks/experience-promotions/ExperiencePromotionsBlock";
import { ExperienceReviewsBlock } from "@/components/experience-builder/blocks/experience-reviews/ExperienceReviewsBlock";
import {
  businessToHeroDTO,
  businessToSubnavDTO,
  businessToDescriptionSectionDTO,
  businessToInfoGridDTO,
  businessToCtaBarDTO,
} from "@/lib/experience-builder/adapters/business-to-blocks";

/* ------------------------------------------------------------------ *
 * Contexto — poblado por la ruta pública (SSR-safe).
 * ------------------------------------------------------------------ */

export const BusinessSurfaceContext = createContext<MarketplaceBusinessDetail | null>(null);

export function BusinessSurfaceProvider({
  business,
  children,
}: {
  business: MarketplaceBusinessDetail | null;
  children: React.ReactNode;
}) {
  return (
    <BusinessSurfaceContext.Provider value={business}>
      {children}
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
  hotel:        { eyebrow: "Hospedaje",   productsHeading: "Habitaciones y experiencias", productsEmpty: "Sin habitaciones publicadas." },
  hospedaje:    { eyebrow: "Hospedaje",   productsHeading: "Habitaciones y experiencias", productsEmpty: "Sin habitaciones publicadas." },
  restaurante:  { eyebrow: "Gastronomía", productsHeading: "Menú y reservaciones",         productsEmpty: "Sin menú publicado." },
  cafeteria:    { eyebrow: "Gastronomía", productsHeading: "Menú",                          productsEmpty: "Sin menú publicado." },
  cenote:       { eyebrow: "Naturaleza",  productsHeading: "Accesos y experiencias",       productsEmpty: "Sin accesos publicados." },
  museo:        { eyebrow: "Cultura",     productsHeading: "Entradas y visitas guiadas",   productsEmpty: "Sin entradas publicadas." },
  agencia:      { eyebrow: "Operador",    productsHeading: "Tours y paquetes",              productsEmpty: "Sin tours publicados." },
  tour:         { eyebrow: "Experiencia", productsHeading: "Tours disponibles",             productsEmpty: "Sin tours publicados." },
  transporte:   { eyebrow: "Transporte",  productsHeading: "Rutas y traslados",             productsEmpty: "Sin traslados publicados." },
  tienda:       { eyebrow: "Tienda",      productsHeading: "Catálogo",                       productsEmpty: "Sin productos publicados." },
  servicio:     { eyebrow: "Servicio",    productsHeading: "Servicios",                      productsEmpty: "Sin servicios publicados." },
};

export function resolveBusinessVariant(categorySlug: string): CategoryVariant {
  return (
    CATEGORY_VARIANTS[categorySlug] ?? {
      eyebrow: "Marketplace",
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
}

export function BusinessSurface({ business: propBusiness }: BusinessSurfaceProps = {}) {
  const ctxBusiness = useContext(BusinessSurfaceContext);
  const b = propBusiness ?? ctxBusiness;

  if (!b) {
    return (
      <PublicShell
        title="Empresa no disponible"
        crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: "—" }]}
      >
        <p className="text-sm text-muted-foreground">
          Aún no publicamos esta empresa.
        </p>
      </PublicShell>
    );
  }

  const variant = resolveBusinessVariant(b.category_slug);
  const tier = b.plan_tier;
  const showPromotions = planAllows(tier, "promotions") && b.promotions.length > 0;

  // H-03 · Ola I2.d — Refactor final: BusinessSurface es orquestador
  // puro. Cero JSX visual propio. Toda la presentación proviene
  // exclusivamente de bloques oficiales del Experience Builder.
  // Responsabilidades restantes: proveer contexto (BusinessSurfaceProvider),
  // adaptar datos (adapters), y componer la secuencia declarativa de
  // bloques + anchors que la sub-navegación necesita.
  const heroDto = businessToHeroDTO(b);
  const subnavDto = businessToSubnavDTO(b);
  const descriptionSection = businessToDescriptionSectionDTO(b);
  const infoGridDto = businessToInfoGridDTO(b);
  const ctaBarDto = businessToCtaBarDTO(b);

  return (
    <PublicShell
      crumbs={[{ label: "Marketplace", to: "/marketplace" }, { label: b.display_name }]}
      useContextCrumbs
    >
      <ExperienceHero
        dto={heroDto}
        headingLevel="h1"
        extensionsSlot={
          <div className="flex flex-wrap items-center gap-3">
            <FavoriteButton entityKind="business" entityId={b.id} />
          </div>
        }
      />

      <ExperienceSubnav dto={subnavDto} className="mt-6 mb-6" />

      {descriptionSection || infoGridDto ? (
        <section id="resumen" data-eb-anchor className="scroll-mt-24">
          {descriptionSection ? <ExperienceSection dto={descriptionSection} /> : null}
          {infoGridDto ? <ExperienceInfoGrid dto={infoGridDto} className="mt-6" /> : null}
        </section>
      ) : null}

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

      <ExperienceCtaBar dto={ctaBarDto} />
    </PublicShell>
  );
}
