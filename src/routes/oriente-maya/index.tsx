/**
 * /oriente-maya — Región Oriente Maya (SSR).
 *
 * La región usa su catálogo Premium aprobado y no el bloque de micrositio
 * de destino. Los datos siguen llegando del CMS; la composición visual
 * corresponde a IMG_0575 y comparte el sistema multi-marca del sitio.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import {
  buildPublicHead,
  touristDestinationJsonLd,
  collectionPageJsonLd,
  ORIENTE_MAYA_PLACE_ID,
} from "@/lib/discovery/seo";
import { ORIENTE_MAYA } from "@/config/regions";
import { SITE } from "@/config/site";
import { RegionDestinationsPremiumSurface } from "@/components/destination-premium/RegionDestinationsPremiumSurface";

import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";

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
    const destinations = await listPublishedDestinations().catch(() => []);
    return { destinations };
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
          aboutPlaceId: ORIENTE_MAYA_PLACE_ID,
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
    <PublicShell variant="hero" crumbs={[{ label: ORIENTE_MAYA.name }]}>
      <RegionDestinationsPremiumSurface destinations={[]} />
    </PublicShell>
  ),
});

function OrienteMayaIndex() {
  const { destinations } = Route.useLoaderData();
  const { presentacion } = Route.useSearch() as { presentacion?: string };
  const declaration = buildRegionContext();
  return (
    <PublicShell variant="hero" contextDeclaration={declaration} useContextCrumbs>
      <div
        data-region-template="premium-approved"
        data-region-presentation={presentacion === "cinematografica" ? "cinematic" : "editorial"}
      >
        <RegionDestinationsPremiumSurface
          destinations={destinations}
          presentation={presentacion === "cinematografica" ? "cinematic" : "editorial"}
        />
      </div>
    </PublicShell>
  );
}
