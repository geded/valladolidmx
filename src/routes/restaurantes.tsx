import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set(["restaurantes", "gastronomia"]);

export const Route = createFileRoute("/restaurantes")({
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
  return (
    <PublicShell
      eyebrow="Categoría"
      title="Restaurantes"
      description="Cocina yucateca, panuchos, recados y mesas de autor."
      crumbs={[{ label: "Restaurantes" }]}
    >
      <MarketplaceSurface
        items={businesses}
        emptyMessage="Aún no hay restaurantes publicados. Vuelve pronto para descubrir cocineras y mesas locales."
      />
    </PublicShell>
  );
}
