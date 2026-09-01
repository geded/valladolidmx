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
/* eslint-disable react-refresh/only-export-components -- I3-A keeps the legacy context and pure contract builder in the authorized surface module. */
import { createContext, useContext, type ReactNode } from "react";
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
import { PremiumHero } from "@/components/premium";
import { DEFAULT_PREMIUM_PRESENTATION } from "@/lib/omxds/presentation/presentation";
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
  type DestinationBlockInput,
} from "@/lib/experience-builder/adapters/destination-to-blocks";
import type { PublicMediaAttribution } from "@/lib/media/public-attribution";
import { hasForbiddenDestinationMedia } from "@/lib/destinations/public-media-policy";
import { DestinationPremiumSurface } from "@/components/destination-premium/DestinationPremiumSurface";
import {
  buildDestinationPremiumRuntime,
  type DestinationPremiumNearbySource,
} from "@/components/destination-premium/destination-premium-runtime";
import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
import { isF1kDestination } from "@/lib/omxds/pilot-allowlist";
import {
  createOmxdsSurfaceContract,
  isOmxdsSurfaceContract,
  type OmxdsSurfaceContract,
  type OmxdsSurfaceOmission,
} from "@/lib/omxds/surfaces/surface-contract";

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
  /** G8-F1D — atribución acreditada por medio (ALT, caption, crédito). */
  galleryMedia?: PublicMediaAttribution[];
  /** Destinos publicados del corpus real para continuidad territorial. */
  nearbyDestinations?: DestinationPremiumNearbySource[];
}

export const DestinationSurfaceContext = createContext<DestinationSurfaceContextValue | null>(null);

export function DestinationSurfaceProvider({
  db,
  related,
  slug,
  mapPoints,
  galleryUrls,
  galleryMedia,
  nearbyDestinations,
  children,
}: DestinationSurfaceContextValue & { children: React.ReactNode }) {
  return (
    <DestinationSurfaceContext.Provider
      value={{ db, related, slug, mapPoints, galleryUrls, galleryMedia, nearbyDestinations }}
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
  /** G8-F1D — atribución acreditada de los medios (ALT, caption, crédito). */
  galleryMedia?: PublicMediaAttribution[];
  /** Destinos publicados del corpus real para continuidad territorial. */
  nearbyDestinations?: DestinationPremiumNearbySource[];
  /** I3-A · contrato validado; ausente conserva exactamente el renderer vigente. */
  surfaceContract?: OmxdsSurfaceContract;
  /** G5 · sólo true cuando la ficha superó la elegibilidad Premium individual. */
  premiumEnabled?: boolean;
}

function destinationRelatedCounts(related?: DestinationRelatedDTO | null) {
  return {
    hoteles: related?.hoteles.length ?? 0,
    restaurantes: related?.restaurantes.length ?? 0,
    experiencias: related?.experiencias.length ?? 0,
    otras: related?.otras.length ?? 0,
    productos: related?.productos.length ?? 0,
    eventos: related?.eventos?.length ?? 0,
  };
}

export function buildDestinationSurfaceContract(
  input: DestinationBlockInput,
  provenanceKind: "fixture" | "governed_source" = "governed_source",
): OmxdsSurfaceContract | null {
  const omissions: OmxdsSurfaceOmission[] = [];
  const hasMedia = Boolean(input.heroUrl) || input.galleryUrls.length > 0;
  const hasMap =
    input.mapPoints.length > 0 || (input.latitude !== null && input.longitude !== null);
  const relatedTotal = Object.values(input.relatedCounts).reduce(
    (total, count) => total + count,
    0,
  );

  if (!hasMedia) omissions.push("media");
  if (!hasMap) omissions.push("map");
  if (relatedTotal === 0) omissions.push("collection");

  return createOmxdsSurfaceContract({
    contractVersion: "i3-0",
    entityId: `destination:${input.slug}`,
    family: "destination",
    title: input.name,
    state: hasMedia ? "ready" : "no_media",
    provenance: {
      kind: provenanceKind,
      reference:
        provenanceKind === "fixture"
          ? `fixture:fictional:i3-a:${input.slug}`
          : `destination:${input.slug}`,
    },
    actions: [
      {
        id: "discover",
        label: `Explorar ${input.name}`,
        role: "dominant",
        href: `/oriente-maya/${encodeURIComponent(input.slug)}#explora`,
      },
    ],
    omissions,
  });
}

export interface DestinationSurfaceContractBoundaryProps extends DestinationSurfaceProps {
  enabled: boolean;
  legacy: ReactNode;
}

function PremiumRelatedCollection({ service, name }: { service: string; name: string }) {
  const kind =
    service === "hoteles"
      ? "hotel"
      : service === "restaurantes"
        ? "restaurant"
        : service === "eventos"
          ? "event"
          : service === "experiencias" || service === "que-hacer"
            ? "experience"
            : "business";
  return (
    <ExperienceRelatedCollectionBlock
      config={{
        source: "destination",
        entityKind: kind,
        variant: "grid",
        columns: 3,
        heading: `${service === "que-hacer" ? "Qué hacer" : service.charAt(0).toUpperCase() + service.slice(1)} en ${name}`,
        emptyMessage: "Aún no hay opciones publicadas en esta categoría.",
        groups: [
          { id: service, entityKind: kind, categorySlug: service, maxItems: 6, variant: "grid" },
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
      }}
    />
  );
}

function withoutUnaccreditedRelatedMedia(
  related?: DestinationRelatedDTO,
): DestinationRelatedDTO | null {
  if (!related) return null;
  const stripBusiness = <T extends { cover_url?: string | null }>(item: T): T => ({
    ...item,
    cover_url: null,
  });
  return {
    ...related,
    hoteles: related.hoteles.map(stripBusiness),
    restaurantes: related.restaurantes.map(stripBusiness),
    experiencias: related.experiencias.map(stripBusiness),
    otras: related.otras.map(stripBusiness),
    productos: related.productos.map(stripBusiness),
    eventos: related.eventos?.map((event) => ({ ...event, cover_url: null })) ?? [],
  };
}

export function DestinationSurfaceContractBoundary({
  enabled,
  legacy,
  destinationSlug,
  dbData,
  related,
  mapPoints,
  galleryUrls,
  galleryMedia,
  premiumEnabled,
  nearbyDestinations,
}: DestinationSurfaceContractBoundaryProps) {
  if (destinationSlug && dbData && isF1kDestination(destinationSlug)) {
    const accreditedMedia = (galleryMedia ?? []).filter(
      (item) => !hasForbiddenDestinationMedia(item),
    );
    const safeRelated = withoutUnaccreditedRelatedMedia(related);
    const content = buildDestinationPremiumRuntime({
      id: `destination:${destinationSlug}`,
      destination: dbData,
      media: accreditedMedia,
      mapPoints: (mapPoints ?? []).map((point) => ({ ...point, badge: point.badge ?? null })),
      nearbyDestinations,
    });
    return (
      <div
        data-omxds-visual-foundations="enabled"
        data-destination-template="premium-g4"
        data-destination-presentation={premiumEnabled ? "cinematic" : "editorial"}
      >
        <DestinationSurfaceProvider
          db={dbData}
          related={safeRelated}
          slug={destinationSlug}
          mapPoints={mapPoints}
          galleryUrls={accreditedMedia.map((item) => item.url)}
          galleryMedia={accreditedMedia}
        >
          <DestinationPremiumSurface
            content={content}
            heroVariant={premiumEnabled ? "cinematic" : "editorial"}
            sections={{ gallery: accreditedMedia.length > 0 }}
            heroAction={
              dbData.id ? (
                <AddToTravelPlanButton
                  kind="destination"
                  targetId={dbData.id}
                  title={dbData.name}
                  slug={destinationSlug}
                  imageUrl={content.hero.cover.url || null}
                  subtitle={dbData.tagline}
                  variant="full"
                  eligibilityMode="legacy"
                />
              ) : null
            }
            renderServicePreview={(service) => (
              <PremiumRelatedCollection service={service.key} name={dbData.name} />
            )}
          />
        </DestinationSurfaceProvider>
      </div>
    );
  }
  if (!enabled || !destinationSlug) return legacy;

  const mock = DESTINOS_MOCK.find(
    (destination) =>
      destination.slug === destinationSlug && destination.region_slug === ORIENTE_MAYA.slug,
  );
  if (!dbData && !mock) return legacy;

  const input = toDestinationBlockInput(dbData, mock ?? null, {
    slug: destinationSlug,
    regionSlug: ORIENTE_MAYA.slug,
    regionName: ORIENTE_MAYA.name,
    counts: destinationRelatedCounts(related),
    galleryUrls: galleryUrls ?? [],
    mediaAttribution: galleryMedia ?? [],
    mapPoints: mapPoints ?? [],
  });
  const surfaceContract = buildDestinationSurfaceContract(input);
  if (!surfaceContract) return legacy;

  return (
    <DestinationSurface
      destinationSlug={destinationSlug}
      dbData={dbData}
      related={related}
      mapPoints={mapPoints}
      galleryUrls={galleryUrls}
      galleryMedia={galleryMedia}
      surfaceContract={surfaceContract}
      premiumEnabled={premiumEnabled}
    />
  );
}

export function DestinationSurface({
  destinationSlug,
  dbData,
  related,
  mapPoints,
  galleryUrls,
  galleryMedia,
  surfaceContract,
  premiumEnabled = false,
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
  const effectiveGalleryMedia = galleryMedia ?? ctx?.galleryMedia ?? [];
  const mock = slug
    ? DESTINOS_MOCK.find((d) => d.slug === slug && d.region_slug === ORIENTE_MAYA.slug)
    : undefined;

  if (!db && !mock) {
    return (
      <PublicShell
        title="Destino no disponible"
        crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: "—" }]}
      >
        <p className="text-muted-foreground">Aún no publicamos esta página de destino.</p>
      </PublicShell>
    );
  }

  const input = toDestinationBlockInput(db, mock ?? null, {
    slug: slug ?? "",
    regionSlug: ORIENTE_MAYA.slug,
    regionName: ORIENTE_MAYA.name,
    counts: destinationRelatedCounts(rel),
    galleryUrls: effectiveGalleryUrls,
    mediaAttribution: effectiveGalleryMedia,
    mapPoints: effectiveMapPoints,
  });

  const galleryDto = destinationToGalleryDTO(input);
  const heroDtoRaw = destinationToHeroDTO(input);
  // G8-F1D · Medio acreditado para el renderer Premium compartido: se
  // reutiliza la primera diapositiva ya resuelta por el adaptador.
  const heroSlide = heroDtoRaw.mediaSlides?.[0] ?? null;
  const premiumHeroUrl = input.galleryUrls[0] ?? input.heroUrl ?? "";
  const premiumHeroMedia = premiumHeroUrl
    ? {
        url: premiumHeroUrl,
        alt:
          (heroSlide?.url === premiumHeroUrl ? heroSlide?.alt : null) ||
          `Vista de ${input.name}, Oriente Maya de Yucatán`,
        ...(heroSlide?.url === premiumHeroUrl && heroSlide?.caption
          ? { caption: heroSlide.caption }
          : {}),
        ...(heroSlide?.url === premiumHeroUrl && heroSlide?.credit
          ? { credit: heroSlide.credit }
          : {}),
      }
    : null;
  // Tourist Hero `gallery` v1.2.0 — el propio Hero es el carrusel
  // Airbnb-style. Cuando se activa, el mosaico `ExperienceGallery`
  // se omite para no duplicar la imagen dominante.
  const heroDto = heroDtoRaw;
  const showGalleryMosaic = heroDto.variant !== "gallery" && Boolean(galleryDto);
  const subnavDto = destinationToSubnavDTO(input);
  const descriptionSection = destinationToDescriptionSectionDTO(input);
  const highlightsFeatures = destinationToHighlightsFeaturesDTO(input);
  const activeContract =
    surfaceContract &&
    isOmxdsSurfaceContract(surfaceContract) &&
    surfaceContract.family === "destination"
      ? surfaceContract
      : null;
  const legacyCtaBarDto = destinationToCtaBarDTO(input);
  const dominantAction = activeContract?.actions.find((action) => action.role === "dominant");
  const ctaBarDto = activeContract
    ? {
        ...legacyCtaBarDto,
        actions: dominantAction?.href
          ? [
              {
                label: dominantAction.label,
                action: "navigate" as const,
                href: dominantAction.href,
                emphasis: "primary" as const,
              },
            ]
          : [],
      }
    : legacyCtaBarDto;
  const badgeItems = destinationToBadgeItems(input);
  void destinationToMapDTO; // mapa ahora se renderiza dentro del Explorador Inline

  // A13 · Puntos geolocalizados del contenido publicado del destino
  // para el banner proactivo de Alux (sólo se muestra si hay ≥3 cerca).
  const nearbyPoints = (() => {
    if (!rel) return [];
    const src = [...rel.hoteles, ...rel.restaurantes, ...rel.experiencias, ...rel.otras];
    return src
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => ({ id: b.id, lat: Number(b.latitude), lng: Number(b.longitude) }));
  })();

  return (
    <DestinationSurfaceProvider db={db} related={rel} slug={slug ?? null}>
      <PublicShell
        crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: input.name }]}
        useContextCrumbs
      >
        {showGalleryMosaic && galleryDto ? (
          <section id="galeria" data-eb-anchor className="scroll-mt-24">
            <ExperienceGallery dto={galleryDto} />
          </section>
        ) : null}

        {premiumEnabled && activeContract ? (
          <div className={showGalleryMosaic ? "mt-6" : undefined}>
            <PremiumHero
              vm={{
                presentation: DEFAULT_PREMIUM_PRESENTATION,
                // D-03 · La ruta territorial navegable la emite PublicShell.
                // El Hero no repite el breadcrumb decorativo.
                eyebrow: "Destino · Oriente Maya de Yucatán",
                title: input.name,
                description: input.tagline || input.description || undefined,
                // G8-F1D · El medio Premium hereda ALT, caption y crédito
                // acreditados del hero gobernado; sin metadata conserva
                // el ALT descriptivo previo.
                media: premiumHeroMedia,
                primaryAction: dominantAction?.href
                  ? { label: dominantAction.label, href: dominantAction.href }
                  : undefined,
              }}
            />
          </div>
        ) : (
          <ExperienceHero
            dto={heroDto}
            headingLevel="h1"
            className={showGalleryMosaic ? "mt-6" : undefined}
          />
        )}

        {nearbyPoints.length >= 3 ? (
          <AluxNearbySuggestionBanner destinationLabel={input.name} points={nearbyPoints} />
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

          {rel && !activeExplora && !activeContract?.omissions.includes("collection") ? (
            <section id="descubre" data-eb-anchor className="scroll-mt-24">
              <ExperienceRelatedCollectionBlock
                config={{
                  source: "destination",
                  entityKind: "mixed",
                  variant: "grid",
                  columns: 2,
                  heading: "Sigue descubriendo",
                  subheading: `Empresas, eventos y experiencias de ${input.name} para continuar construyendo tu viaje.`,
                  emptyMessage: "Aún no hay negocios ni experiencias publicadas para este destino.",
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
