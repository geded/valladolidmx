/**
 * G4-PLACES · Listado regional de Lugares y sitios de interés.
 *
 * Paridad con `/eventos`: misma autoridad de listado
 * (`ListingPremiumSurfaceFromDTO` → `TerritorialListingReviewSurface`),
 * mismo contrato público (`PublicListingDTO`) y lecturas reales de
 * `points_of_interest`. El parámetro `?destino=` activa el contexto
 * bloqueado con cercanos separados.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";
import { ORIENTE_MAYA } from "@/config/regions";
import {
  publishedDestinationsQueryOptions,
  useDestinationLabel,
} from "@/lib/destinations/destination-labels";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";

/** Contexto territorial: el destino se hereda o se declara, nunca se pide. */
function buildLugaresContext(
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
      slug: "lugares",
      label: "Lugares y sitios de interés",
      href: "/lugares",
    },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/lugares",
  });
}

export const Route = createFileRoute("/lugares/")({
  validateSearch: (search: Record<string, unknown>): { destino?: string } =>
    typeof search.destino === "string" && search.destino ? { destino: search.destino } : {},
  loaderDeps: ({ search }) => ({ destino: search.destino }),

  head: () =>
    buildPublicHead({
      title: `Lugares y sitios de interés · ${SITE.name}`,
      description:
        "Cenotes, conventos, zonas arqueológicas, calles y rincones que cuentan el Oriente Maya.",
      path: "/lugares",
    }),
  loader: async ({ deps, context }) => {
    // Lote 3B — Nombres de destino reales disponibles en SSR.
    await context.queryClient.ensureQueryData(publishedDestinationsQueryOptions).catch(() => []);
    const destino = deps.destino ?? null;
    const [dto, regional] = await Promise.all([
      getPublicListing({ data: { family: "lugares", destino } }),
      destino
        ? getPublicListing({ data: { family: "lugares", destino: null } })
        : Promise.resolve(null),
    ]);
    // Descubrimiento: lugares de otros destinos, jamás mezclados en el
    // conteo local del destino activo.
    const nearby = regional
      ? regional.items.filter((item) => !dto.items.some((local) => local.id === item.id))
      : [];
    return { dto, nearby, destino };
  },
  component: LugaresPage,
});

function LugaresPage() {
  const destinationLabel = useDestinationLabel();
  const { dto, nearby, destino } = Route.useLoaderData();
  const label = destino ? (dto.destinationLabel ?? destinationLabel(destino)) : null;
  const crumbs = [
    { label: "Lugares y sitios de interés", to: "/lugares" },
    ...(label ? [{ label }] : []),
  ];
  return (
    <PublicShell
      crumbs={crumbs}
      contextDeclaration={buildLugaresContext(destino ?? undefined, destinationLabel)}
      useContextCrumbs
      compactCrumbsOnMobile
    >
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        showAddToTrip
        showFavorite
        nearbyItems={nearby}
        lockedDestinationLabel={label}
      />
    </PublicShell>
  );
}
