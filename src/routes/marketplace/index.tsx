/**
 * /marketplace — Vitrina pública SSR (Ola 4 · Etapa 1).
 *
 * Lectura read-only vía marketplace-reads.functions.ts (cliente
 * publishable + RLS TO anon). Sin sesión, sin RPCs, sin escrituras.
 * head() emite título, descripción y OG/Twitter propios del listado.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import {
  listMarketplaceBusinesses,
} from "@/lib/marketplace/marketplace-reads.functions";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";

const TITLE = `Marketplace — ${SITE.name}`;
const DESCRIPTION =
  "Descubre empresas verificadas, experiencias y promociones publicadas en el destino. Vitrina oficial del Marketplace.";

export const Route = createFileRoute("/marketplace/")({
  loader: async () => {
    const [businesses, composition] = await Promise.all([
      listMarketplaceBusinesses(),
      getPublishedCompositionBySlug({ data: { slug: "marketplace" } }),
    ]);
    return { businesses, composition };
  },
  head: () =>
    buildPublicHead({
      title: TITLE,
      description: DESCRIPTION,
      path: "/marketplace",
      ogType: "website",
    }),
  component: MarketplaceIndex,
  errorComponent: ({ error }) => (
    <PublicShell title="Marketplace no disponible" crumbs={[{ label: "Marketplace" }]}>
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell title="Marketplace no disponible" crumbs={[{ label: "Marketplace" }]}>
      <p className="text-sm text-muted-foreground">No hay empresas publicadas aún.</p>
    </PublicShell>
  ),
});

function MarketplaceIndex() {
  const { composition } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Marketplace"
      title="Empresas y experiencias publicadas"
      description="Vitrina pública del destino con empresas verificadas del Oriente Maya."
      crumbs={[{ label: "Marketplace" }]}
    >
      {composition ? (
        <CompositionRenderer tree={composition.snapshot} />
      ) : (
        <MarketplaceSurface />
      )}
    </PublicShell>
  );
}