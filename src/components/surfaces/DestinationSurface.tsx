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
import { useParams, useSearch } from "@tanstack/react-router";
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
import { ExperienceFeatures } from "@/components/experience-builder/blocks/experience-features/ExperienceFeatures";
import { ExperienceCtaBar } from "@/components/experience-builder/blocks/experience-cta-bar/ExperienceCtaBar";
import { ExperienceRelatedCollectionBlock } from "@/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollectionBlock";
import { InstitutionalBadgesBlock } from "@/components/experience-builder/blocks/experience-institutional-badges/InstitutionalBadgesBlock";
import { ExperienceGallery } from "@/components/experience-builder/blocks/experience-gallery/ExperienceGallery";
import { AluxNearbySuggestionBanner } from "@/components/alux/AluxNearbySuggestionBanner";
import type { ExperienceMapPoint } from "@/lib/experience-builder/blocks/experience-map/contract";
import {
  toDestinationBlockInput,
  destinationToHeroDTO,
  destinationToSubnavDTO,
  destinationToDescriptionSectionDTO,
  destinationToHighlightsFeaturesDTO,
  destinationToCtaBarDTO,
  destinationToBadgeItems,
  destinationToMapDTO,
  destinationToGalleryDTO,
} from "@/lib/experience-builder/adapters/destination-to-blocks";

/* ------------------------------------------------------------------ *
 * Contexto — poblado por la ruta pública (SSR-safe).
 * ------------------------------------------------------------------ */

export interface DestinationSurfaceContextValue {
  db: PublicDestinationDTO | null;
  related: DestinationRelatedDTO | null;
  slug: string | null;
  /** SEO.A2.M1 — puntos del mapa territorial (hidratado por la ruta). */
  mapPoints?: ExperienceMapPoint[];
  /** SEO.A2.M1 — galería (URLs) hidratada por la ruta. */
  galleryUrls?: string[];
}

export const DestinationSurfaceContext =
  createContext<DestinationSurfaceContextValue | null>(null);

export function DestinationSurfaceProvider({
  db,
  related,
  slug,
  mapPoints,
  galleryUrls,
  children,
}: DestinationSurfaceContextValue & { children: React.ReactNode }) {
  return (
    <DestinationSurfaceContext.Provider
      value={{ db, related, slug, mapPoints, galleryUrls }}
    >
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
  const routeSearch = useSearch({ strict: false }) as { explora?: string };
  const activeExplora = routeSearch?.explora ?? null;
  const ctx = useContext(DestinationSurfaceContext);
  const slug = destinationSlug ?? params.destino ?? ctx?.slug ?? undefined;
  const db = dbData ?? ctx?.db ?? null;
  const rel = related ?? ctx?.related ?? null;
  const effectiveMapPoints = mapPoints ?? ctx?.mapPoints ?? [];
  const effectiveGalleryUrls = galleryUrls ?? ctx?.galleryUrls ?? [];
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
    galleryUrls: effectiveGalleryUrls,
    mapPoints: effectiveMapPoints,
  });

  const galleryDto = destinationToGalleryDTO(input);
  const heroDtoRaw = destinationToHeroDTO(input);
  // Tourist Hero `gallery` v1.2.0 — el propio Hero es el carrusel
  // Airbnb-style. Cuando se activa, el mosaico `ExperienceGallery`
  // se omite para no duplicar la imagen dominante.
  const heroDto = heroDtoRaw;
  const showGalleryMosaic = heroDto.variant !== "gallery" && Boolean(galleryDto);
  const subnavDto = destinationToSubnavDTO(input);
  const descriptionSection = destinationToDescriptionSectionDTO(input);
  const highlightsFeatures = destinationToHighlightsFeaturesDTO(input);
  const ctaBarDto = destinationToCtaBarDTO(input);
  const badgeItems = destinationToBadgeItems(input);
  void destinationToMapDTO; // mapa ahora se renderiza dentro del Explorador Inline

  // A13 · Puntos geolocalizados del contenido publicado del destino
  // para el banner proactivo de Alux (sólo se muestra si hay ≥3 cerca).
  const nearbyPoints = (() => {
    if (!rel) return [];
    const src = [
      ...rel.hoteles,
      ...rel.restaurantes,
      ...rel.experiencias,
      ...rel.otras,
    ];
    return src
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => ({ id: b.id, lat: Number(b.latitude), lng: Number(b.longitude) }));
  })();

  return (
    <DestinationSurfaceProvider db={db} related={rel} slug={slug ?? null}>
    <PublicShell
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: input.name },
      ]}
      useContextCrumbs
    >
      {showGalleryMosaic && galleryDto ? (
        <section id="galeria" data-eb-anchor className="scroll-mt-24">
          <ExperienceGallery dto={galleryDto} />
        </section>
      ) : null}

      <ExperienceHero dto={heroDto} headingLevel="h1" className={showGalleryMosaic ? "mt-6" : undefined} />

      {nearbyPoints.length >= 3 ? (
        <AluxNearbySuggestionBanner
          destinationLabel={input.name}
          points={nearbyPoints}
        />
      ) : null}

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

      <div className="space-y-10">
        {descriptionSection || highlightsFeatures ? (
            <section id="resumen" data-eb-anchor className="scroll-mt-24">
              {descriptionSection ? <ExperienceSection dto={descriptionSection} /> : null}
              {highlightsFeatures ? (
                <ExperienceFeatures dto={highlightsFeatures} className="mt-6" />
              ) : null}
            </section>
          ) : null}

        <section id="explora" data-eb-anchor className="scroll-mt-24">
          <DiscoveryNavigatorBlock
            config={{
              title: `Explora ${input.name}`,
              scope: "destination",
              manualDestinationSlug: slug ?? undefined,
              mode: "inline",
              variant: "grid",
            }}
          />
        </section>

        {/* Mapa territorial ahora vive dentro del Explorador Inline
            (`DiscoveryNavigatorBlock` mode="inline") para evitar duplicidad. */}

        {rel && !activeExplora ? (
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

      <ExperienceCtaBar dto={ctaBarDto} />
    </PublicShell>
    </DestinationSurfaceProvider>
  );
}
