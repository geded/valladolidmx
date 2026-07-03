/**
 * /casas-de-vacaciones — Hospedaje independiente (Sprint Reconciliación 5).
 *
 * Superficie pública que reutiliza `MarketplaceSurface` filtrando negocios
 * cuya categoría primaria coincide con hospedaje tipo casa/villa. Si no
 * hay categoría específica todavía, cae con fallback elegante hacia
 * hoteles/hospedaje sin exponer textos de fase.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  listMarketplaceBusinesses,
  type MarketplaceBusinessCard,
} from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const CATEGORY_SLUGS = new Set([
  "casas-de-vacaciones",
  "casas-vacacionales",
  "villas",
  "rentas-vacacionales",
  "airbnb",
  "casas",
]);

export const Route = createFileRoute("/casas-de-vacaciones")({
  validateSearch: (search: Record<string, unknown>) => ({
    destino: typeof search.destino === "string" ? search.destino : undefined,
  }),
  loader: async () => {
    const all = await listMarketplaceBusinesses();
    return { businesses: all.filter((b) => CATEGORY_SLUGS.has(b.category_slug)) };
  },
  head: () =>
    buildPublicHead({
      title: `Casas de vacaciones · ${SITE.name}`,
      description:
        "Casas, villas y rentas vacacionales para explorar el Oriente Maya a tu ritmo.",
      path: "/casas-de-vacaciones",
    }),
  component: CasasRoute,
});

function CasasRoute() {
  const { businesses } = Route.useLoaderData();
  const { destino } = Route.useSearch();
  const filtered = destino
    ? businesses.filter((b: MarketplaceBusinessCard) => b.destination_slug === destino)
    : businesses;
  return (
    <PublicShell
      eyebrow="Hospedaje"
      title={destino ? `Casas de vacaciones en ${destino.replace(/-/g, " ")}` : "Casas de vacaciones"}
      description="Casas, villas y rentas vacacionales para explorar el Oriente Maya a tu ritmo."
      crumbs={[
        { label: "Casas de vacaciones", to: "/casas-de-vacaciones" },
        ...(destino ? [{ label: destino.replace(/-/g, " ") }] : []),
      ]}
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage="Aún estamos verificando casas de vacaciones. Mientras tanto, explora hoteles y haciendas del Oriente Maya."
      />
    </PublicShell>
  );
}