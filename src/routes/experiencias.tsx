import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listMarketplaceBusinesses, type MarketplaceBusinessCard } from "@/lib/marketplace/marketplace-reads.functions";
import { MarketplaceSurface } from "@/components/surfaces/MarketplaceSurface";
import { ORIENTE_MAYA } from "@/config/regions";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import {
  defineRouteContext,
  type RouteContextDeclaration,
} from "@/lib/context-engine";

const CATEGORY_SLUGS = new Set(["experiencias", "experiencias-tours", "tours"]);

function destinationLabel(slug: string): string {
  return DESTINOS_MOCK.find((d) => d.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

/**
 * H-02 · I5 — Declaración de contexto (patrón I4).
 * El filtro editorial `?tema=` NO participa en el contexto jerárquico
 * (no es una entidad territorial ni una categoría). Sigue reflejándose
 * únicamente en el breadcrumb legacy como etiqueta hoja.
 */
function buildExperienciasContext(destino: string | undefined): RouteContextDeclaration {
  const explicitAncestors = destino
    ? [
        { kind: "region" as const, slug: ORIENTE_MAYA.slug, label: ORIENTE_MAYA.name, href: "/oriente-maya" },
        { kind: "destination" as const, slug: destino, label: destinationLabel(destino), href: `/oriente-maya/${destino}` },
      ]
    : [];
  return defineRouteContext({
    current: { kind: "category", slug: "experiencias", label: "Experiencias", href: "/experiencias" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/experiencias",
  });
}

export const Route = createFileRoute("/experiencias")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.destino === "string" ? { destino: search.destino } : {}),
    ...(typeof search.tema === "string" ? { tema: search.tema } : {}),
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
  const contextDeclaration = buildExperienciasContext(destino);
  const legacyCrumbs = [
    { label: "Experiencias", to: "/experiencias" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
    ...(humanTema && !destino ? [{ label: humanTema }] : []),
  ];
  return (
    <PublicShell
      eyebrow="Categoría"
      title={
        destino
          ? `Experiencias en ${destinationLabel(destino)}`
          : humanTema
            ? `Experiencias · ${humanTema}`
            : "Experiencias"
      }
      description="Vivencias auténticas con comunidades, cocineros y guías locales del Oriente Maya."
      crumbs={legacyCrumbs}
      contextDeclaration={contextDeclaration}
      useContextCrumbs={!humanTema || !!destino}
    >
      <MarketplaceSurface
        items={filtered}
        emptyMessage={
          destino
            ? `Aún no hay experiencias publicadas en ${destinationLabel(destino)}.`
            : "Aún no hay experiencias publicadas. Vuelve pronto para descubrir vivencias con guías locales."
        }
      />
    </PublicShell>
  );
}
