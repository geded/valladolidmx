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
import { ORIENTE_MAYA } from "@/config/regions";
import {
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

const CATEGORY_SLUGS = new Set([
  "casas-de-vacaciones",
  "casas-vacacionales",
  "villas",
  "rentas-vacacionales",
  "airbnb",
  "casas",
]);

/** H-02 · I5 — Declaración de contexto (patrón I4). */
function buildCasasContext(destino: string | undefined): RouteContextDeclaration {
  const explicitAncestors = destino
    ? [
        { kind: "region" as const, slug: ORIENTE_MAYA.slug, label: ORIENTE_MAYA.name, href: "/oriente-maya" },
        { kind: "destination" as const, slug: destino, label: destino.replace(/-/g, " "), href: `/oriente-maya/${destino}` },
      ]
    : [];
  return defineRouteContext({
    current: {
      kind: "category",
      slug: "casas-de-vacaciones",
      label: "Casas de vacaciones",
      href: "/casas-de-vacaciones",
    },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/casas-de-vacaciones",
  });
}

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
  const contextDeclaration = buildCasasContext(destino);
  const legacyCrumbs = [
    { label: "Casas de vacaciones", to: "/casas-de-vacaciones" },
    ...(destino ? [{ label: destino.replace(/-/g, " ") }] : []),
  ];
  return (
    <PublicShell
      eyebrow="Hospedaje"
      title={destino ? `Casas de vacaciones en ${destino.replace(/-/g, " ")}` : "Casas de vacaciones"}
      description="Casas, villas y rentas vacacionales para explorar el Oriente Maya a tu ritmo."
      crumbs={legacyCrumbs}
      contextDeclaration={contextDeclaration}
      useContextCrumbs
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage="Aún estamos verificando casas de vacaciones. Mientras tanto, explora hoteles y haciendas del Oriente Maya."
      />
    </PublicShell>
  );
}