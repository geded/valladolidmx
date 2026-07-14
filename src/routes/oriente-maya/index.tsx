/**
 * /oriente-maya — Región Oriente Maya (SSR).
 *
 * US-R3 · Ola 2 · Sub-ola 2.1: la vista de la Región ahora se sirve
 * desde el Experience Builder resolviendo la plantilla oficial por
 * `kind = region` (slug interno `__tpl_region__`). Fallback seguro
 * a `<RegionSurface />` (misma UI) si la composición no está publicada.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import {
  buildPublicHead,
  touristDestinationJsonLd,
  collectionPageJsonLd,
} from "@/lib/discovery/seo";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { RegionSurface } from "@/components/surfaces/RegionSurface";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import {
  ContextEngineProvider,
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

/**
 * H-02 · I7 · Fila 1 — Región-hub declara contexto raíz.
 *
 * Sin ancestros ni herencia (es la raíz territorial). El provider se
 * monta a nivel de ruta y envuelve tanto la composición EB como el
 * fallback `RegionSurface`. Su función principal aquí es persistir
 * `previous = region:oriente-maya` en sessionStorage para que rutas
 * hijas (categorías planas, fichas) puedan heredar territorio.
 *
 * `canonical` = `/oriente-maya` (idéntico al legacy — no toca SEO).
 */
function buildRegionContext(): RouteContextDeclaration {
  return defineRouteContext({
    current: {
      kind: "region",
      slug: ORIENTE_MAYA.slug,
      label: ORIENTE_MAYA.name,
      href: "/oriente-maya",
    },
    ancestors: [],
    canonical: "/oriente-maya",
  });
}

export const Route = createFileRoute("/oriente-maya/")({
  loader: async () => {
    const [composition, destinations] = await Promise.all([
      getPublishedCompositionBySlug({ data: { slug: "__tpl_region__" } }).catch(() => null),
      listPublishedDestinations().catch(() => []),
    ]);
    return { composition, destinations };
  },
  head: ({ loaderData }) => {
    const destinations = loaderData?.destinations ?? [];
    return buildPublicHead({
      title: `Oriente Maya — Destinos turísticos de Yucatán · ${SITE.name}`,
      description: ORIENTE_MAYA.short_description,
      path: "/oriente-maya",
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: ORIENTE_MAYA.name, path: "/oriente-maya" },
      ],
      jsonLd: [
        touristDestinationJsonLd({
          name: ORIENTE_MAYA.name,
          description: ORIENTE_MAYA.short_description,
          path: "/oriente-maya",
          touristType: ["Cultural", "Naturaleza", "Historia Maya", "Gastronomía", "Cenotes"],
          keywords: [
            "Valladolid",
            "Chichén Itzá",
            "Ek Balam",
            "Izamal",
            "Espita",
            "Río Lagartos",
            "Las Coloradas",
            "cenotes",
            "Yucatán",
          ],
        }),
        collectionPageJsonLd({
          name: `Destinos del ${ORIENTE_MAYA.name}`,
          description: ORIENTE_MAYA.short_description,
          path: "/oriente-maya",
          items: destinations.map((d: { slug: string; name: string }) => ({
            name: d.name,
            path: `/oriente-maya/${d.slug}`,
          })),
        }),
      ],
    });
  },
  component: OrienteMayaIndex,
  errorComponent: () => (
    <PublicShell title={ORIENTE_MAYA.name} crumbs={[{ label: ORIENTE_MAYA.name }]}>
      <RegionSurface />
    </PublicShell>
  ),
});

function OrienteMayaIndex() {
  const { composition, destinations } = Route.useLoaderData();
  const declaration = buildRegionContext();
  // Provider a nivel de ruta — igual patrón que I3 en `/oriente-maya/$destino`.
  // Cubre las dos ramas de render (EB y fallback) sin tocar sus shells.
  return (
    <ContextEngineProvider declaration={declaration}>
      {composition ? (
        <CompositionRenderer tree={composition.snapshot} />
      ) : (
        <RegionSurface destinations={destinations} />
      )}
    </ContextEngineProvider>
  );
}
