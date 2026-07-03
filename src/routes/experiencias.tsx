import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses, type MarketplaceBusinessCard } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set(["experiencias", "experiencias-tours", "tours"]);

export const Route = createFileRoute("/experiencias")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
    tema: typeof search.tema === "string" ? search.tema : undefined,
  }),
  loader: async () => {
    const all = await listMarketplaceBusinesses();
    return { businesses: all.filter((b) => CATEGORY_SLUGS.has(b.category_slug)) };
  },
  head: () =>
    buildPublicHead({
      title: `Experiencias · ${SITE.name}`,
      description:
        "Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya.",
      path: "/experiencias",
    }),
  component: ExperienciasRoute,
});

function ExperienciasRoute() {
  const { businesses } = Route.useLoaderData();
  const { destino, tema } = Route.useSearch();
  const filtered = destino
    ? businesses.filter((b: MarketplaceBusinessCard) => b.destination_slug === destino)
    : businesses;
  const humanTema = tema ? tema.replace(/-/g, " ") : null;
  return (
    <PublicShell
      eyebrow="Categoría"
      title={
        destino
          ? `Experiencias en ${destino.replace(/-/g, " ")}`
          : humanTema
            ? `Experiencias · ${humanTema}`
            : "Experiencias"
      }
      description="Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya."
      crumbs={[
        { label: "Experiencias", to: "/experiencias" },
        ...(destino ? [{ label: destino.replace(/-/g, " ") }] : []),
        ...(humanTema && !destino ? [{ label: humanTema }] : []),
      ]}
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage={
          destino
            ? `Aún no hay experiencias publicadas en ${destino.replace(/-/g, " ")}.`
            : "Aún no hay experiencias publicadas. Vuelve pronto para descubrir vivencias con guías locales."
        }
      />
    </PublicShell>
  );
}
