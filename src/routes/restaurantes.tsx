import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses, type MarketplaceBusinessCard } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set(["restaurantes", "gastronomia"]);

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
  return (
    <PublicShell
      eyebrow="Categoría"
      title={destino ? `Restaurantes en ${destino.replace(/-/g, " ")}` : "Restaurantes"}
      description="Cocina yucateca, panuchos, recados y mesas de autor."
      crumbs={[{ label: "Restaurantes", to: "/restaurantes" }, ...(destino ? [{ label: destino.replace(/-/g, " ") }] : [])]}
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage={
          destino
            ? `Aún no hay restaurantes publicados en ${destino.replace(/-/g, " ")}.`
            : "Aún no hay restaurantes publicados. Vuelve pronto para descubrir cocineras y mesas locales."
        }
      />
    </PublicShell>
  );
}
