import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { ORIENTE_MAYA } from "@/config/regions";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";

const CATEGORY_SLUGS = new Set(["restaurantes", "gastronomia"]);

function destinationLabel(slug: string): string {
  return DESTINOS_MOCK.find((d) => d.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

/**
 * H-02 · I5 — Declaración de contexto (patrón I4).
 * `canonical` siempre `/restaurantes` (SEO intacto).
 */
function buildRestaurantesContext(destino: string | undefined): RouteContextDeclaration {
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
    current: {
      kind: "category",
      slug: "restaurantes",
      label: "Restaurantes",
      href: "/restaurantes",
    },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/restaurantes",
  });
}

export const Route = createFileRoute("/restaurantes")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
    presentacion:
      search.presentacion === "cinematografica" ? ("cinematografica" as const) : undefined,
  }),
  loaderDeps: ({ search }) => ({ destino: search.destino }),
  loader: async ({ deps }) => ({
    dto: await getPublicListing({
      data: { family: "restaurantes", destino: deps.destino ?? null },
    }),
  }),
  head: () =>
    buildPublicHead({
      title: `Restaurantes · ${SITE.name}`,
      description: "Cocina yucateca, panuchos, recados y mesas de autor.",
      path: "/restaurantes",
    }),
  component: RestaurantesRoute,
});

function RestaurantesRoute() {
  const { dto } = Route.useLoaderData();
  const { destino, presentacion } = Route.useSearch();
  const contextDeclaration = buildRestaurantesContext(destino);
  const legacyCrumbs = [
    { label: "Restaurantes", to: "/restaurantes" },
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
