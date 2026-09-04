/**
 * Lote 3C · `/rutas/{slug}` — Perfil público de una Ruta / Itinerario.
 *
 * SSR read-only sobre `editorial_routes` publicadas. Shell, breadcrumb
 * compacto y Alux idénticos al resto de fichas Premium.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicRoute } from "@/lib/routes-editorial/route-public-reads.functions";
import { ORIENTE_MAYA } from "@/config/regions";
import { RoutePremiumSurface } from "@/components/routes-premium/RoutePremiumSurface";
import {
  ContextEngineProvider,
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";
import type { EditorialRouteDetailDTO } from "@/lib/routes-editorial/route-public-contract";

function buildRouteContext(route: EditorialRouteDetailDTO): RouteContextDeclaration {
  // Lote 3C-V — la ruta declara su territorio de origen para que el contexto
  // (breadcrumb + Alux) reconozca región y destino sin heredarlos por azar.
  const originSlug = route.originDestinationSlug ?? route.destinationSlugs[0] ?? null;
  const explicitAncestors = originSlug
    ? [
        {
          kind: "region" as const,
          slug: ORIENTE_MAYA.slug,
          label: ORIENTE_MAYA.name,
          href: "/oriente-maya",
        },
        {
          kind: "destination" as const,
          slug: originSlug,
          label:
            route.originDestinationLabel ?? originSlug.replace(/-/g, " "),
          href: `/oriente-maya/${originSlug}`,
        },
      ]
    : [];
  // Lote 3C · cierre — Alux recibe los IDs y slugs reales de la ruta:
  // destinos relacionados y paradas navegables publicadas.
  const relatedDestinations = route.destinationSlugs
    .filter((slug) => slug && slug !== originSlug)
    .map((slug) => ({
      kind: "destination" as const,
      slug,
      label: slug.replace(/-/g, " "),
      href: `/oriente-maya/${slug}`,
    }));
  const relatedStops = route.stops
    .filter((stop) => Boolean(stop.href))
    .map((stop) => ({
      kind: "custom" as const,
      slug: stop.id,
      label: stop.title,
      href: stop.href!,
      meta: {
        entityKind: stop.entityKind,
        entityId: stop.entityId,
        dayNumber: stop.dayNumber,
        position: stop.position,
      },
    }));

  return defineRouteContext({
    current: {
      kind: "route",
      slug: route.slug,
      label: route.name,
      href: `/rutas/${route.slug}`,
      meta: {
        routeId: route.id,
        interests: route.interests,
        audiences: route.audiences,
        seasons: route.seasons,
        destinationSlugs: route.destinationSlugs,
        originDestinationSlug: originSlug,
      },
    },
    ancestors: explicitAncestors,
    related: [...relatedDestinations, ...relatedStops],
    inherit: explicitAncestors.length ? [] : ["region", "destination"],
    canonical: `/rutas/${route.slug}`,
    kindDefaults: [{ kind: "site_section", label: "Rutas", href: "/rutas" }],
  });
}


export const Route = createFileRoute("/rutas/$slug")({
  loader: async ({ params }) => {
    const route = await getPublicRoute({ data: { slug: params.slug } });
    if (!route) throw notFound();
    return { route };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return buildPublicHead({
        title: "Ruta no disponible",
        description: "Esta ruta no existe o aún no ha sido publicada.",
        path: `/rutas/${params.slug}`,
        noindex: true,
      });
    }
    const r = loaderData.route;
    return buildPublicHead({
      title: `${r.name} · Rutas — ${SITE.name}`,
      description: r.summary || `Itinerario sugerido del Oriente Maya: ${r.name}.`,
      path: `/rutas/${r.slug}`,
      ogType: "article",
      ...(r.coverUrl ? { ogImage: r.coverUrl } : {}),
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: "Rutas", path: "/rutas" },
        { label: r.name, path: `/rutas/${r.slug}` },
      ],
    });
  },
  component: RutaPage,
  notFoundComponent: () => (
    <PublicShell
      title="Ruta no encontrada"
      crumbs={[{ label: "Rutas", to: "/rutas" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">No publicamos esa ruta todavía.</p>
    </PublicShell>
  ),
  errorComponent: ({ error }) => (
    <PublicShell
      title="Ruta no disponible"
      crumbs={[{ label: "Rutas", to: "/rutas" }, { label: "—" }]}
    >
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
});

function RutaPage() {
  const { route } = Route.useLoaderData();
  return (
    <ContextEngineProvider declaration={buildRouteContext(route)}>
      <PublicShell
        crumbs={[{ label: "Rutas", to: "/rutas" }, { label: route.name }]}
        useContextCrumbs
        compactCrumbsOnMobile
      >
        <RoutePremiumSurface route={route} />
      </PublicShell>
    </ContextEngineProvider>
  );
}
