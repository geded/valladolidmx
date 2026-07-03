import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set(["hoteles", "hospedaje"]);

export const Route = createFileRoute("/hoteles")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
  }),
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
  const { destino } = Route.useSearch();
  const filtered = destino ? businesses.filter((b) => b.destination_slug === destino) : businesses;
  return (
    <PublicShell
      eyebrow="Categoría"
      title={destino ? `Hoteles en ${destino.replace(/-/g, " ")}` : "Hoteles"}
      description="Haciendas restauradas, posadas familiares y refugios en el corazón del Oriente Maya."
      crumbs={[{ label: "Hoteles", to: "/hoteles" }, ...(destino ? [{ label: destino.replace(/-/g, " ") }] : [])]}
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage={
          destino
            ? `Aún no hay hoteles publicados en ${destino.replace(/-/g, " ")}.`
            : "Aún no hay hoteles publicados. Vuelve pronto para descubrir hospedajes verificados."
        }
      />
    </PublicShell>
  );
}
