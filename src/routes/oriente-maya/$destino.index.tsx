/**
 * /oriente-maya/{destino} — Ficha pública de Destino (SSR).
 *
 * US-R3 · Ola 2 · Sub-ola 2.1: la ficha se sirve desde el Experience
 * Builder resolviendo la plantilla oficial por `kind = destination`
 * (slug interno `__tpl_destination__`). El slug del destino se lee
 * dentro de la superficie desde el router. Fallback seguro a
 * `<DestinationSurface />` (misma UI) si la composición no existe.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import {
  buildPublicHead,
  touristDestinationJsonLd,
  ORIENTE_MAYA_PLACE_ID,
} from "@/lib/discovery/seo";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";
import { stableIndexableImageUrl } from "@/lib/media/stable-public-url";
import {
  DestinationSurface,
  DestinationSurfaceContractBoundary,
  DestinationSurfaceProvider,
} from "@/components/surfaces/DestinationSurface";
import { getOmxdsSurfaceContractsFlag } from "@/lib/omxds/surfaces/surface-contracts-flag.server";
import { getDestinationPremiumEligibility } from "@/lib/omxds/surfaces/destination-premium-eligibility.server";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import {
  getPublicDestinationBySlug,
  getDestinationRelated,
  getDestinationMapPoints,
  getDestinationGalleryMedia,
} from "@/lib/destinations/public-reads.functions";
import { getEvaluationLotSlugs } from "@/lib/omxds/evaluation-lot.functions";
import { isInEvaluationLot } from "@/lib/omxds/evaluation-lot";
import { isF1kDestination } from "@/lib/omxds/pilot-allowlist";
import { resolveHomePremiumRealContent } from "@/lib/experience-builder/smart-blocks.functions";

import {
  ContextEngineProvider,
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

/**
 * H-02 · I3 — Construye la declaración de contexto de la ficha de
 * destino. Se ejecuta en render (no en loader) para que la etiqueta
 * refleje siempre el nombre resuelto (BD > mock > slug crudo).
 */
function buildDestinationContext(slug: string, displayName: string): RouteContextDeclaration {
  return defineRouteContext({
    current: {
      kind: "destination",
      slug,
      label: displayName,
      href: `/oriente-maya/${slug}`,
    },
    ancestors: [
      {
        kind: "region",
        slug: ORIENTE_MAYA.slug,
        label: ORIENTE_MAYA.name,
        href: "/oriente-maya",
      },
    ],
    canonical: `/oriente-maya/${slug}`,
  });
}

export const Route = createFileRoute("/oriente-maya/$destino/")({
  loader: async ({ params }) => {
    const mock = DESTINOS_MOCK.find(
      (d) => d.slug === params.destino && d.region_slug === ORIENTE_MAYA.slug,
    );
    // SEO.A2.M1 · Territorial Landing MVP — se resuelve primero una
    // composición específica por slug (`dest-<slug>`) y, en su ausencia,
    // la plantilla oficial `__tpl_destination__`. Misma arquitectura que
    // `/oriente-maya` (Región).
    // 19.23 — La elegibilidad Premium del destino se lee SIEMPRE y es
    // independiente del flag global (fail-closed dentro del server fn).
    const [
      db,
      related,
      mapPoints,
      galleryMedia,
      specific,
      template,
      surfaceContractsEnabled,
      premiumEligibility,
      evaluationLot,
      homeRealContent,
    ] = await Promise.all([
      getPublicDestinationBySlug({ data: { slug: params.destino } }).catch(() => null),
      getDestinationRelated({ data: { slug: params.destino } }).catch(() => null),
      getDestinationMapPoints({ data: { slug: params.destino } }).catch(() => []),
      getDestinationGalleryMedia({ data: { slug: params.destino } }).catch(() => []),
      getPublishedCompositionBySlug({ data: { slug: `dest-${params.destino}` } }).catch(() => null),
      getPublishedCompositionBySlug({ data: { slug: "__tpl_destination__" } }).catch(() => null),
      getOmxdsSurfaceContractsFlag().catch(() => false),
      getDestinationPremiumEligibility({ data: { slug: params.destino } }).catch(() => null),
      // G8-R1-F1G · Lote interno de evaluación → noindex mientras dure.
      getEvaluationLotSlugs().catch(() => null),
      resolveHomePremiumRealContent().catch(() => null),
    ]);
    if (!mock && !db) throw notFound();
    const dest = {
      slug: params.destino,
      name: db?.name ?? mock?.name ?? params.destino,
      tagline: db?.tagline ?? mock?.tagline ?? "",
      hero_palette: (db?.hero_palette ?? mock?.hero_palette ?? "territorio") as
        | "territorio"
        | "selva"
        | "cenote"
        | "atardecer",
      highlights: (db?.highlights?.length ? db.highlights : (mock?.highlights ?? [])) as string[],
    };
    const composition = specific ?? template ?? null;
    const premiumEnabled = premiumEligibility?.eligible === true;
    // 19.23 — Fuente estable para OG/JSON-LD (proxy canónico), nunca una
    // URL firmada temporal. Sin cover gobernada se conserva el
    // comportamiento previo.
    const stableCoverUrl = premiumEnabled ? (premiumEligibility?.cover?.url ?? null) : null;
    const governedGalleryUrls = premiumEnabled
      ? [
          ...(premiumEligibility?.cover ? [premiumEligibility.cover.url] : []),
          ...(premiumEligibility?.gallery ?? []).map((item) => item.url),
        ]
      : [];
    // G8-F1D — La lectura acreditada aporta URL + atribución. Los URLs
    // gobernados Premium conservan prioridad; la atribución viaja aparte.
    const galleryUrls = galleryMedia.map((m) => m.url);
    return {
      dest,
      db,
      related,
      mapPoints,
      galleryMedia,
      galleryUrls: governedGalleryUrls.length > 0 ? governedGalleryUrls : galleryUrls,
      composition,
      surfaceContractsEnabled,
      premiumEnabled,
      stableCoverUrl,
      // G8-R1-F1L · Los 7 destinos bajo revisión visual F1K permanecen
      // `noindex, nofollow` hasta la autorización expresa del Founder.
      inEvaluationLot:
        isInEvaluationLot(evaluationLot, "destination", params.destino) ||
        isF1kDestination(params.destino),
      nearbyDestinations: homeRealContent?.destinos ?? [],
    };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? buildPublicHead({
          noindex: loaderData.inEvaluationLot,
          title: `${loaderData.dest.name} — ${ORIENTE_MAYA.name} · ${SITE.name}`,
          description:
            loaderData.db?.description?.trim() ||
            loaderData.dest.tagline ||
            `${loaderData.dest.name}, destino turístico del ${ORIENTE_MAYA.name} de Yucatán.`,
          path: `/oriente-maya/${params.destino}`,
          ogType: "article",
          // 19.24 — Sólo ruta pública estable. Sin asset elegible se omite
          // la imagen; prohibido caer a una URL firmada temporal.
          ogImage: loaderData.stableCoverUrl ?? stableIndexableImageUrl(loaderData.db?.hero_url),
          breadcrumbs: [
            { label: "Inicio", path: "/" },
            { label: ORIENTE_MAYA.name, path: "/oriente-maya" },
            { label: loaderData.dest.name, path: `/oriente-maya/${params.destino}` },
          ],
          jsonLd: [
            touristDestinationJsonLd({
              name: loaderData.dest.name,
              description:
                loaderData.db?.description?.trim() ||
                loaderData.dest.tagline ||
                loaderData.dest.name,
              path: `/oriente-maya/${params.destino}`,
              image: loaderData.stableCoverUrl ?? stableIndexableImageUrl(loaderData.db?.hero_url),
              latitude: loaderData.db?.latitude ?? null,
              longitude: loaderData.db?.longitude ?? null,
              containedInId: ORIENTE_MAYA_PLACE_ID,
              keywords: loaderData.dest.highlights,
              touristType: ["Cultural", "Naturaleza", "Gastronomía", "Historia Maya"],
            }),
          ],
        })
      : { meta: [], links: [], scripts: [] },
  component: DestinoPage,
  notFoundComponent: DestinoNotFound,
});

function DestinoPage() {
  const {
    dest,
    db,
    related,
    mapPoints,
    galleryUrls,
    galleryMedia,
    composition,
    surfaceContractsEnabled,
    premiumEnabled,
    nearbyDestinations,
  } = Route.useLoaderData();
  const declaration = buildDestinationContext(dest.slug, dest.name);
  // SEO.A2.M1 — La ruta hidrata `DestinationSurfaceProvider` con los
  // datos server-side. Si existe composición publicada (plantilla o
  // específica), se renderiza vía Experience Builder; en su ausencia
  // cae al render directo de `<DestinationSurface />` (misma UI).
  return (
    <ContextEngineProvider declaration={declaration}>
      <DestinationSurfaceProvider
        db={db ?? null}
        related={related ?? null}
        slug={dest.slug}
        mapPoints={mapPoints ?? []}
        galleryUrls={galleryUrls ?? []}
        galleryMedia={galleryMedia ?? []}
      >
        <DestinationSurfaceContractBoundary
          // 19.23 — Premium por ficha: el flag global conserva su función
          // para el resto de contratos; la habilitación del destino
          // depende del conjunto gobernado completo.
          enabled={surfaceContractsEnabled || premiumEnabled}
          destinationSlug={dest.slug}
          dbData={db ?? undefined}
          related={related ?? undefined}
          mapPoints={mapPoints ?? []}
          galleryUrls={galleryUrls ?? []}
          galleryMedia={galleryMedia ?? []}
          premiumEnabled={premiumEnabled}
          nearbyDestinations={nearbyDestinations}
          legacy={
            composition ? (
              <CompositionRenderer tree={composition.snapshot} />
            ) : (
              <DestinationSurface
                dbData={db ?? undefined}
                related={related ?? undefined}
                mapPoints={mapPoints ?? []}
                galleryUrls={galleryUrls ?? []}
                galleryMedia={galleryMedia ?? []}
                premiumEnabled={premiumEnabled}
              />
            )
          }
        />
      </DestinationSurfaceProvider>
    </ContextEngineProvider>
  );
}

function DestinoNotFound() {
  // Fallback defensivo: se construye contexto mínimo con el slug crudo
  // (el router no expone params tipados en notFoundComponent). El
  // breadcrumb visible sigue el `crumbs` legacy si el contexto no
  // aporta más — comportamiento idéntico al previo.
  const fallbackDeclaration = defineRouteContext({
    current: { kind: "destination", label: "—", href: undefined },
    ancestors: [
      {
        kind: "region",
        slug: ORIENTE_MAYA.slug,
        label: ORIENTE_MAYA.name,
        href: "/oriente-maya",
      },
    ],
    canonical: "/oriente-maya",
  });
  return (
    <PublicShell
      title="Destino no disponible"
      crumbs={[{ label: ORIENTE_MAYA.name, to: "/oriente-maya" }, { label: "—" }]}
      contextDeclaration={fallbackDeclaration}
      useContextCrumbs={false}
    >
      <p className="text-muted-foreground">Aún no publicamos esta página de destino.</p>
    </PublicShell>
  );
}
