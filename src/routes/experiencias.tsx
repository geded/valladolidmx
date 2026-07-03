import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set(["experiencias", "experiencias-tours", "tours"]);

export const Route = createFileRoute("/experiencias")({
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
  return (
    <PublicShell
      eyebrow="Categoría"
      title="Experiencias"
      description="Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya."
      crumbs={[{ label: "Experiencias" }]}
    >
      <MarketplaceSurface
        items={businesses}
        emptyMessage="Aún no hay experiencias publicadas. Vuelve pronto para descubrir vivencias con guías locales."
      />
    </PublicShell>
  );
}
