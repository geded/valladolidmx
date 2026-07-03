import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set(["hoteles", "hospedaje"]);

export const Route = createFileRoute("/hoteles")({
  loader: async () => {
    const all = await listMarketplaceBusinesses();
    return { businesses: all.filter((b) => CATEGORY_SLUGS.has(b.category_slug)) };
  },
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
  const { businesses } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Categoría"
      title="Hoteles"
      description="Haciendas restauradas, posadas familiares y refugios en el corazón del Oriente Maya."
      crumbs={[{ label: "Hoteles" }]}
    >
      <MarketplaceSurface
        items={businesses}
        emptyMessage="Aún no hay hoteles publicados. Vuelve pronto para descubrir hospedajes verificados."
      />
    </PublicShell>
  );
}
