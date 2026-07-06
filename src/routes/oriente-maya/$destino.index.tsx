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
import { buildPublicHead } from "@/lib/discovery/seo";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";
import { DestinationSurface } from "@/components/surfaces/DestinationSurface";
import {
  getPublicDestinationBySlug,
  getDestinationRelated,
  getDestinationMapPoints,
  getDestinationGalleryUrls,
} from "@/lib/destinations/public-reads.functions";
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
function buildDestinationContext(
  slug: string,
  displayName: string,
): RouteContextDeclaration {
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
    const [db, related, mapPoints, galleryUrls] = await Promise.all([
      getPublicDestinationBySlug({ data: { slug: params.destino } }).catch(() => null),
      getDestinationRelated({ data: { slug: params.destino } }).catch(() => null),
      getDestinationMapPoints({ data: { slug: params.destino } }).catch(() => []),
      getDestinationGalleryUrls({ data: { slug: params.destino } }).catch(() => []),
    ]);
    if (!mock && !db) throw notFound();
    const dest = {
      slug: params.destino,
      name: db?.name ?? mock?.name ?? params.destino,
      tagline: db?.tagline ?? mock?.tagline ?? "",
      hero_palette: (db?.hero_palette ?? mock?.hero_palette ?? "territorio") as
        "territorio" | "selva" | "cenote" | "atardecer",
      highlights: (db?.highlights?.length ? db.highlights : mock?.highlights ?? []) as string[],
    };
    return { dest, db, related, mapPoints, galleryUrls };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? buildPublicHead({
          title: `${loaderData.dest.name} — ${ORIENTE_MAYA.name} · ${SITE.name}`,
          description: loaderData.dest.tagline,
          path: `/oriente-maya/${params.destino}`,
          ogType: "place",
        })
      : { meta: [], links: [], scripts: [] },
  component: DestinoPage,
  notFoundComponent: DestinoNotFound,
});

function DestinoPage() {
  const { dest, db, related, mapPoints, galleryUrls } = Route.useLoaderData();
  const declaration = buildDestinationContext(dest.slug, dest.name);
  // H-02 · I3 — Sólo la RUTA monta el provider. La superficie
  // (`DestinationSurface`) mantiene su propio `PublicShell` intacto —
  // el breadcrumb visible NO cambia. Este provider persiste `previous`
  // en `sessionStorage` para habilitar herencia en I4 (categorías).
  return (
    <ContextEngineProvider declaration={declaration}>
      <DestinationSurface
        dbData={db ?? undefined}
        related={related ?? undefined}
        mapPoints={mapPoints ?? []}
        galleryUrls={galleryUrls ?? []}
      />
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
