import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { ORIENTE_MAYA } from "@/config/regions";
import {
  publishedDestinationsQueryOptions,
  useDestinationLabel,
} from "@/lib/destinations/destination-labels";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";

const CATEGORY_SLUGS = new Set(["hoteles", "hospedaje"]);

/**
 * H-02 · I4 — Declaración de contexto de la categoría piloto.
 *
 * · Sin `destino` en la URL y sin `previous` persistido:
 *   ancestors = []  → breadcrumb visible "Inicio › Hoteles" (idéntico al legacy).
 * · Sin `destino` en la URL y con `previous` persistido desde
 *   `/oriente-maya/$destino` (dentro del TTL de 5 min):
 *   `inherit: ["region","destination"]` inyecta ambos slots →
 *   "Inicio › Oriente Maya › Valladolid › Hoteles".
 * · Con `?destino=<slug>` en la URL (deep link / filtro):
 *   los ancestros se declaran explícitamente (region + destination),
 *   no se depende de `previous` → breadcrumb determinístico.
 *
 * `canonical` es siempre `/hoteles` — la herencia afecta UX, nunca SEO.
 */
function buildHotelesContext(
  destino: string | undefined,
  destinationLabel: (slug: string) => string,
): RouteContextDeclaration {
  const explicitAncestors = destino
    ? [
        {
          kind: "region" as const,
          slug: ORIENTE_MAYA.slug,
          label: ORIENTE_MAYA.name,
          href: "/oriente-maya",
        },
        {
          kind: "destination" as const,
          slug: destino,
          label: destinationLabel(destino),
          href: `/oriente-maya/${destino}`,
        },
      ]
    : [];
  return defineRouteContext({
    current: { kind: "category", slug: "hoteles", label: "Hoteles", href: "/hoteles" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/hoteles",
  });
}

export const Route = createFileRoute("/hoteles")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
    presentacion:
      search.presentacion === "cinematografica" ? ("cinematografica" as const) : undefined,
  }),
  loaderDeps: ({ search }) => ({ destino: search.destino }),
  loader: async ({ deps, context }) => ({
    dto: await getPublicListing({ data: { family: "hoteles", destino: deps.destino ?? null } }),
  }),
  head: () =>
    buildPublicHead({
      title: `Hoteles · ${SITE.name}`,
      description:
        "Haciendas restauradas, posadas familiares y refugios en el corazón del Oriente Maya.",
      path: "/hoteles",
    }),
  component: HotelesRoute,
});

function HotelesRoute() {
  const destinationLabel = useDestinationLabel();
  const { dto } = Route.useLoaderData();
  const { destino, presentacion } = Route.useSearch();
  const contextDeclaration = buildHotelesContext(destino, destinationLabel);
  const legacyCrumbs = [
    { label: "Hoteles", to: "/hoteles" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
  ];
  return (
    <PublicShell crumbs={legacyCrumbs} contextDeclaration={contextDeclaration} useContextCrumbs compactCrumbsOnMobile>
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        presentation={presentacion === "cinematografica" ? "cinematic" : "editorial"}
        showAddToTrip
        showFavorite
      />
    </PublicShell>
  );
}
