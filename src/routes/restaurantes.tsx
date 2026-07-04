import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses, type MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";
import { ORIENTE_MAYA } from "@/config/regions";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import {
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

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
        { kind: "region" as const, slug: ORIENTE_MAYA.slug, label: ORIENTE_MAYA.name, href: "/oriente-maya" },
        { kind: "destination" as const, slug: destino, label: destinationLabel(destino), href: `/oriente-maya/${destino}` },
      ]
    : [];
  return defineRouteContext({
    current: { kind: "category", slug: "restaurantes", label: "Restaurantes", href: "/restaurantes" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/restaurantes",
  });
}

export const Route = createFileRoute("/restaurantes")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
  }),
  loader: async () => {
    const all = await listMarketplaceBusinesses();
    return { businesses: all.filter((b) => CATEGORY_SLUGS.has(b.category_slug)) };
  },
  head: () =>
    buildPublicHead({
      title: `Restaurantes · ${SITE.name}`,
      description: "Cocina yucateca, panuchos, recados y mesas de autor.",
      path: "/restaurantes",
    }),
  component: RestaurantesRoute,
});

function RestaurantesRoute() {
  const { businesses } = Route.useLoaderData();
  const { destino } = Route.useSearch();
  const filtered = destino
    ? businesses.filter((b: MarketplaceBusinessCard) => b.destination_slug === destino)
    : businesses;
  const contextDeclaration = buildRestaurantesContext(destino);
  const legacyCrumbs = [
    { label: "Restaurantes", to: "/restaurantes" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
  ];
  return (
    <PublicShell
      eyebrow="Categoría"
      title={destino ? `Restaurantes en ${destinationLabel(destino)}` : "Restaurantes"}
      description="Cocina yucateca, panuchos, recados y mesas de autor."
      crumbs={legacyCrumbs}
      contextDeclaration={contextDeclaration}
      useContextCrumbs
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage={
          destino
            ? `Aún no hay restaurantes publicados en ${destinationLabel(destino)}.`
            : "Aún no hay restaurantes publicados. Vuelve pronto para descubrir cocineras y mesas locales."
        }
      />
    </PublicShell>
  );
}
