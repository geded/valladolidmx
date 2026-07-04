import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses, type MarketplaceBusinessCard } from "@/lib/catalog/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";
import { ORIENTE_MAYA } from "@/config/regions";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import {
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

const CATEGORY_SLUGS = new Set(["hoteles", "hospedaje"]);

function destinationLabel(slug: string): string {
  return DESTINOS_MOCK.find((d) => d.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

/**
 * H-02 · I4 — Declaración de contexto de la categoría piloto.
 *
 * · Sin `destino` en la URL y sin `previous` persistido:
 *   ancestors = []  → breadcrumb visible "Inicio › Hoteles" (idéntico al legacy).
 * · Sin `destino` en la URL y con `previous` persistido desde
 *   `/oriente-maya/$destino` (dentro del TTL de 5 min):
 *   `inherit: ["region","destination"]` inyecta ambos slots →
 *   "Inicio › Oriente Maya › Valladolid › Hoteles".
 * · Con `?destino=<slug>` en la URL (deep link / filtro):
 *   los ancestros se declaran explícitamente (region + destination),
 *   no se depende de `previous` → breadcrumb determinístico.
 *
 * `canonical` es siempre `/hoteles` — la herencia afecta UX, nunca SEO.
 */
function buildHotelesContext(destino: string | undefined): RouteContextDeclaration {
  const explicitAncestors = destino
    ? [
        {
          kind: "region" as const,
          slug: ORIENTE_MAYA.slug,
          label: ORIENTE_MAYA.name,
          href: "/oriente-maya",
        },
        {
          kind: "destination" as const,
          slug: destino,
          label: destinationLabel(destino),
          href: `/oriente-maya/${destino}`,
        },
      ]
    : [];
  return defineRouteContext({
    current: { kind: "category", slug: "hoteles", label: "Hoteles", href: "/hoteles" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/hoteles",
  });
}

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
  const filtered = destino
    ? businesses.filter((b: MarketplaceBusinessCard) => b.destination_slug === destino)
    : businesses;
  const contextDeclaration = buildHotelesContext(destino);
  // Fallback defensivo: si por cualquier razón el Context Engine no
  // resolviera migas (provider ausente, ctx null), `crumbs` legacy se
  // usa. Con provider montado, `useContextCrumbs` toma el control.
  const legacyCrumbs = [
    { label: "Hoteles", to: "/hoteles" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
  ];
  return (
    <PublicShell
      eyebrow="Categoría"
      title={destino ? `Hoteles en ${destinationLabel(destino)}` : "Hoteles"}
      description="Haciendas restauradas, posadas familiares y refugios en el corazón del Oriente Maya."
      crumbs={legacyCrumbs}
      contextDeclaration={contextDeclaration}
      useContextCrumbs
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage={
          destino
            ? `Aún no hay hoteles publicados en ${destinationLabel(destino)}.`
            : "Aún no hay hoteles publicados. Vuelve pronto para descubrir hospedajes verificados."
        }
      />
    </PublicShell>
  );
}
