/**
 * Lote 3C · `/rutas` — Listado público canónico de Rutas / Itinerarios.
 *
 * Shell, breadcrumb compacto, header/footer y Alux idénticos al resto de
 * superficies Premium. Filtrado territorial vía `?destino=` (micrositio);
 * sin `destino` muestra todas las rutas publicadas de la región.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { ORIENTE_MAYA } from "@/config/regions";
import {
  publishedDestinationsQueryOptions,
  useDestinationLabel,
} from "@/lib/destinations/destination-labels";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";
import { listPublicRoutes } from "@/lib/routes-editorial/route-public-reads.functions";
import { RoutesListingSurface } from "@/components/routes-premium/RoutesListingSurface";

function buildRutasContext(
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
    current: { kind: "category", slug: "rutas", label: "Rutas", href: "/rutas" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/rutas",
  });
}

export const Route = createFileRoute("/rutas/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.destino === "string" ? { destino: search.destino } : {}),
  }),
  loaderDeps: ({ search }) => ({ destino: search.destino }),
  loader: async ({ deps, context }) => {
    await context.queryClient
      .ensureQueryData(publishedDestinationsQueryOptions)
      .catch(() => []);
    return {
      routes: await listPublicRoutes({ data: { destino: deps.destino ?? null } }),
    };
  },
  head: () =>
    buildPublicHead({
      title: `Rutas e itinerarios · ${SITE.name}`,
      description:
        "Itinerarios sugeridos del Oriente Maya con paradas reales: destinos, lugares, eventos y empresas publicadas.",
      path: "/rutas",
    }),
  component: RutasRoute,
  errorComponent: () => (
    <PublicShell title="Rutas" crumbs={[{ label: "Rutas", to: "/rutas" }]}>
      <p className="text-sm text-muted-foreground">
        No pudimos cargar las rutas en este momento. Intenta de nuevo en unos minutos.
      </p>
    </PublicShell>
  ),
});

function RutasRoute() {
  const destinationLabel = useDestinationLabel();
  const { routes } = Route.useLoaderData();
  const { destino } = Route.useSearch();
  const crumbs = [
    { label: "Rutas", to: "/rutas" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
  ];
  return (
    <PublicShell
      crumbs={crumbs}
      contextDeclaration={buildRutasContext(destino, destinationLabel)}
      useContextCrumbs
      compactCrumbsOnMobile
    >
      <RoutesListingSurface
        routes={routes}
        destinationLabel={destino ? destinationLabel(destino) : null}
        lockedDestinationLabel={destino ? destinationLabel(destino) : null}
      />
    </PublicShell>
  );
}
