/**
 * /casas-de-vacaciones — Hospedaje independiente (Sprint Reconciliación 5).
 *
 * Superficie pública que reutiliza `MarketplaceSurface` filtrando negocios
 * cuya categoría primaria coincide con hospedaje tipo casa/villa. Si no
 * hay categoría específica todavía, cae con fallback elegante hacia
 * hoteles/hospedaje sin exponer textos de fase.
 */
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
import { buildDestinationFacet } from "@/components/surfaces/TourismListingSurface";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";

const CATEGORY_SLUGS = new Set([
  "casas-de-vacaciones",
  "casas-vacacionales",
  "villas",
  "rentas-vacacionales",
  "airbnb",
  "casas",
]);

/** H-02 · I5 — Declaración de contexto (patrón I4). */
function buildCasasContext(
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
    current: {
      kind: "category",
      slug: "casas-de-vacaciones",
      label: "Casas de vacaciones",
      href: "/casas-de-vacaciones",
    },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/casas-de-vacaciones",
  });
}

export const Route = createFileRoute("/casas-de-vacaciones")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
  }),
  loaderDeps: ({ search }) => ({ destino: search.destino }),
  loader: async ({ deps, context }) => ({
    dto: await getPublicListing({
      data: { family: "casas-de-vacaciones", destino: deps.destino ?? null },
    }),
  }),
  head: () =>
    buildPublicHead({
      title: `Casas de vacaciones · ${SITE.name}`,
      description: "Casas, villas y rentas vacacionales para explorar el Oriente Maya a tu ritmo.",
      path: "/casas-de-vacaciones",
    }),
  component: CasasRoute,
});

function CasasRoute() {
  const destinationLabel = useDestinationLabel();
  const { dto } = Route.useLoaderData();
  const { destino } = Route.useSearch();
  const contextDeclaration = buildCasasContext(destino, destinationLabel);
  const legacyCrumbs = [
    { label: "Casas de vacaciones", to: "/casas-de-vacaciones" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
  ];
  const destinoFacet = buildDestinationFacet([...dto.items]);
  return (
    <PublicShell crumbs={legacyCrumbs} contextDeclaration={contextDeclaration} useContextCrumbs compactCrumbsOnMobile>
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        facets={destino || !destinoFacet ? [] : [destinoFacet]}
      />
    </PublicShell>
  );
}
