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
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";

/**
 * H-02 · I7 · Fila 4 — Hub `/marketplace`.
 * Trato como categoría raíz de marketplace. Hereda territorio si hay
 * `previous`. Sin ancestros explícitos. SEO intacto.
 */
function buildMarketplaceContext(): RouteContextDeclaration {
  return defineRouteContext({
    current: { kind: "category", slug: "marketplace", label: "Catálogo", href: "/marketplace" },
    ancestors: [],
    inherit: ["region", "destination"],
    canonical: "/marketplace",
  });
}

const TITLE = `Catálogo Oriente Maya — ${SITE.name}`;
const DESCRIPTION =
  "Descubre empresas verificadas, experiencias y promociones publicadas en el Oriente Maya. Catálogo oficial de Valladolid.mx.";

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
    <PublicShell title="Catálogo no disponible" crumbs={[{ label: "Catálogo" }]}>
      <p className="text-sm text-muted-foreground">{String(error.message)}</p>
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell title="Catálogo no disponible" crumbs={[{ label: "Catálogo" }]}>
      <p className="text-sm text-muted-foreground">No hay empresas publicadas aún.</p>
    </PublicShell>
  ),
});

function MarketplaceIndex() {
  const { composition } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Catálogo Oriente Maya"
      title="Empresas y experiencias publicadas"
      description="Descubre las empresas verificadas del Oriente Maya."
      crumbs={[{ label: "Catálogo" }]}
      contextDeclaration={buildMarketplaceContext()}
      useContextCrumbs
    >
      {composition ? (
        <CompositionRenderer tree={composition.snapshot} />
      ) : (
        <MarketplaceSurface />
      )}
    </PublicShell>
  );
}