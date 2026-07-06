/**
 * H-03 · Ola I3.a/I3.b — DestinationSurface (Plantilla Madre)
 *
 * Segunda Plantilla Madre de referencia, tras BusinessSurface (I2.d).
 * Sigue el mismo patrón arquitectónico aprobado por el Founder:
 *
 *   1. Provider de contexto (`DestinationSurfaceProvider`).
 *   2. Adaptadores de datos (`destination-to-blocks.ts`).
 *   3. Composición de bloques oficiales del Experience Builder.
 *   4. Cero lógica visual propia.
 *   5. Orquestación pura.
 *
 * Regla de Herencia de Plantillas (Founder, tras I2.d): las Plantillas
 * Madre orquestan; los bloques presentan; los motores deciden. Ningún
 * componente presentacional se dibuja aquí — se compone desde la
 * Biblioteca Oficial del Experience Builder.
 *
 * I3.b — La excepción transitoria `LegacyRelatedComposition` queda
 * ELIMINADA. Empresas, eventos y productos del destino se orquestan
 * ahora a través del bloque oficial `vmx.experience.related-collection`
 * (Motor de Descubrimiento) declarado con `source: "destination"` y
 * `groups[]` heterogéneos (business/event/product).
 */
import { createContext, useContext } from "react";
import { useParams } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import type {
  PublicDestinationDTO,
  DestinationRelatedDTO,
} from "@/lib/destinations/public-reads.functions";
import { DiscoveryNavigatorBlock } from "@/components/experience-builder/blocks/DiscoveryNavigatorBlock";
import { ExperienceHero } from "@/components/experience-builder/blocks/experience-hero/ExperienceHero";
import { ExperienceSubnav } from "@/components/experience-builder/blocks/experience-subnav/ExperienceSubnav";
import { ExperienceSection } from "@/components/experience-builder/blocks/experience-section/ExperienceSection";
import { ExperienceInfoGrid } from "@/components/experience-builder/blocks/experience-info-grid/ExperienceInfoGrid";
import { ExperienceCtaBar } from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import { InstitutionalBadgesBlock } from "@/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import { ExperienceMapBlock } from "@/components/experience-builder/blocks/experience-map/ExperienceMapBlock";
import type { ExperienceMapPoint } from "@/lib/experience-builder/blocks/experience-map/contract";
import {
  toDestinationBlockInput,
  destinationToHeroDTO,
  destinationToSubnavDTO,
  destinationToDescriptionSectionDTO,
  destinationToHighlightsInfoGridDTO,
  destinationToCtaBarDTO,
  destinationToBadgeItems,
  destinationToGalleryDTO,
  destinationToMapDTO,
} from "@/lib/experience-builder/adapters/destination-to-blocks";

/* ------------------------------------------------------------------ *
 * Contexto — poblado por la ruta pública (SSR-safe).
 * ------------------------------------------------------------------ */

export interface DestinationSurfaceContextValue {
  db: PublicDestinationDTO | null;
  related: DestinationRelatedDTO | null;
  slug: string | null;
}

export const DestinationSurfaceContext =
  createContext<DestinationSurfaceContextValue | null>(null);

export function DestinationSurfaceProvider({
  db,
  related,
  slug,
  children,
}: DestinationSurfaceContextValue & { children: React.ReactNode }) {
  return (
    <DestinationSurfaceContext.Provider value={{ db, related, slug }}>
      {children}
    </DestinationSurfaceContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 * Surface
 * ------------------------------------------------------------------ */

export interface DestinationSurfaceProps {
  /** Slug del destino a renderizar. Cuando falta, se lee del router. */
  destinationSlug?: string;
  /** Datos enriquecidos desde la BD (Fase 4.1b). */
  dbData?: PublicDestinationDTO;
  /** Contenido relacionado (empresas y productos publicados del destino). */
  related?: DestinationRelatedDTO;
  /** U-VISUAL · V4.2 — Puntos territoriales para `vmx.experience.map`. */
  mapPoints?: ExperienceMapPoint[];
  /** U-VISUAL · V4.2 — URLs de galería (BD) para `vmx.experience.gallery`. */
  galleryUrls?: string[];
}

export function DestinationSurface({
  destinationSlug,
  dbData,
  related,
  mapPoints,
  galleryUrls,
}: DestinationSurfaceProps = {}) {
  const params = useParams({ strict: false }) as { destino?: string };
  const ctx = useContext(DestinationSurfaceContext);
  const slug = destinationSlug ?? params.destino ?? ctx?.slug ?? undefined;
  const db = dbData ?? ctx?.db ?? null;
  const rel = related ?? ctx?.related ?? null;
  const mock = slug
    ? DESTINOS_MOCK.find(
        (d) => d.slug === slug && d.region_slug === ORIENTE_MAYA.slug,
      )
    : undefined;

  if (!db && !mock) {
    return (
      <PublicShell
        title="Destino no disponible"
        crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: "—" }]}
      >
        <p className="text-muted-foreground">
          Aún no publicamos esta página de destino.
        </p>
      </PublicShell>
    );
  }

  const input = toDestinationBlockInput(db, mock ?? null, {
    slug: slug ?? "",
    regionSlug: ORIENTE_MAYA.slug,
    regionName: ORIENTE_MAYA.name,
    counts: {
      hoteles: rel?.hoteles.length ?? 0,
      restaurantes: rel?.restaurantes.length ?? 0,
      experiencias: rel?.experiencias.length ?? 0,
      otras: rel?.otras.length ?? 0,
      productos: rel?.productos.length ?? 0,
      eventos: rel?.eventos?.length ?? 0,
    },
    galleryUrls: galleryUrls ?? [],
    mapPoints: mapPoints ?? [],
  });

  const heroDto = destinationToHeroDTO(input);
  const subnavDto = destinationToSubnavDTO(input);
  const descriptionSection = destinationToDescriptionSectionDTO(input);
  const highlightsInfoGrid = destinationToHighlightsInfoGridDTO(input);
  const ctaBarDto = destinationToCtaBarDTO(input);
  const badgeItems = destinationToBadgeItems(input);
  const galleryDto = destinationToGalleryDTO(input);
  const mapDto = destinationToMapDTO(input);

  return (
    <PublicShell
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: input.name },
      ]}
      useContextCrumbs
    >
      {galleryDto ? (
        <section id="galeria" data-eb-anchor className="scroll-mt-24">
          <ExperienceGallery dto={galleryDto} />
        </section>
      ) : null}

      <div className={galleryDto ? "mt-8" : undefined}>
        <ExperienceHero dto={heroDto} headingLevel="h1" />
      </div>

      {badgeItems.length > 0 ? (
        <div className="mt-6">
          <InstitutionalBadgesBlock
            config={{
              source: "destination",
              subjectSlug: input.slug,
              variant: "soft",
              size: "md",
              layout: "strip",
              items: badgeItems,
              ariaLabel: `Distintivos institucionales de ${input.name}`,
              capabilities: {
                showLabel: true,
                showTooltip: true,
                mobileVisibleMax: 3,
              },
            }}
          />
        </div>
      ) : null}

      <ExperienceSubnav dto={subnavDto} className="mt-6 mb-6" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          {descriptionSection || highlightsInfoGrid ? (
            <section id="resumen" data-eb-anchor className="scroll-mt-24">
              {descriptionSection ? <ExperienceSection dto={descriptionSection} /> : null}
              {highlightsInfoGrid ? (
                <ExperienceInfoGrid dto={highlightsInfoGrid} className="mt-6" />
              ) : null}
            </section>
          ) : null}

          {mapDto ? (
            <section id="ubicacion" data-eb-anchor className="scroll-mt-24">
              <ExperienceMapBlock dto={mapDto} />
            </section>
          ) : null}

          {rel ? (
            <section id="descubre" data-eb-anchor className="scroll-mt-24">
              <ExperienceRelatedCollectionBlock
                config={{
                  source: "destination",
                  entityKind: "mixed",
                  variant: "grid",
                  columns: 2,
                  heading: "Sigue descubriendo",
                  subheading: `Empresas, eventos y experiencias de ${input.name} para continuar construyendo tu viaje.`,
                  emptyMessage:
                    "Aún no hay negocios ni experiencias publicadas para este destino.",
                  ariaLabel: `Descubrimiento contextual en ${input.name}`,
                  groups: [
                    {
                      id: "hoteles",
                      entityKind: "hotel",
                      heading: "Hoteles y hospedajes",
                      maxItems: 6,
                      variant: "grid",
                      seeAllHref: `/oriente-maya/${encodeURIComponent(slug ?? "")}/hoteles`,
                      seeAllLabel: "Ver hoteles",
                    },
                    {
                      id: "restaurantes",
                      entityKind: "restaurant",
                      heading: "Restaurantes",
                      maxItems: 6,
                      variant: "grid",
                      seeAllHref: `/oriente-maya/${encodeURIComponent(slug ?? "")}/restaurantes`,
                      seeAllLabel: "Ver restaurantes",
                    },
                    {
                      id: "experiencias",
                      entityKind: "experience",
                      heading: "Experiencias y rutas",
                      maxItems: 6,
                      variant: "grid",
                      seeAllHref: `/oriente-maya/${encodeURIComponent(slug ?? "")}/experiencias`,
                      seeAllLabel: "Ver experiencias",
                    },
                    {
                      id: "eventos",
                      entityKind: "event",
                      heading: "Próximos eventos",
                      maxItems: 6,
                      variant: "list",
                      seeAllHref: "/eventos",
                      seeAllLabel: "Ver agenda",
                    },
                    {
                      id: "productos",
                      entityKind: "product",
                      heading: "Productos destacados",
                      maxItems: 8,
                      variant: "grid",
                      seeAllHref: `/oriente-maya/${encodeURIComponent(slug ?? "")}`,
                      seeAllLabel: "Ver catálogo",
                    },
                  ],
                  capabilities: {
                    showImage: true,
                    showMeta: true,
                    showBadges: true,
                    showPrice: true,
                    showDate: true,
                    showKindBadge: true,
                    dedupe: true,
                  },
                  contextRefs: {
                    destinationSlug: slug ?? null,
                    regionSlug: ORIENTE_MAYA.slug,
                  },
                }}
              />
            </section>
          ) : null}
        </div>
        <aside className="space-y-4">
          <DiscoveryNavigatorBlock
            config={{
              title: `Explora ${input.name}`,
              scope: "destination",
              manualDestinationSlug: slug ?? undefined,
              // Ya estamos en la superficie del destino: el navegador de
              // categorías es autosuficiente y no necesita un CTA que apunte
              // a otra ruta. Se oculta pasando cadenas vacías.
              ctaLabel: "",
              ctaHref: "",
            }}
          />
        </aside>
      </div>

      <ExperienceCtaBar dto={ctaBarDto} />
    </PublicShell>
  );
}
