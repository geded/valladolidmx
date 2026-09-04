import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getExperiencesListing } from "@/lib/experiences/experience-public-reads.functions";
import { ORIENTE_MAYA } from "@/config/regions";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";
import { ExperiencesListingSurface } from "@/components/experience-premium/ExperiencesListingSurface";

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
    current: {
      kind: "category",
      slug: "experiencias",
      label: "Experiencias",
      href: "/experiencias",
    },
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
  loaderDeps: ({ search }) => ({ destino: search.destino }),
  loader: async ({ deps }) => await getExperiencesListing({
    data: { destino: deps.destino ?? null },
  }),
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
  const { dto, axes, valueLabels } = Route.useLoaderData();
  const { destino, tema } = Route.useSearch();
  const humanTema = tema ? tema.replace(/-/g, " ") : null;
  const contextDeclaration = buildExperienciasContext(destino);
  const legacyCrumbs = [
    { label: "Experiencias", to: "/experiencias" },
    ...(destino ? [{ label: destinationLabel(destino) }] : []),
    ...(humanTema && !destino ? [{ label: humanTema }] : []),
  ];
  const titleOverride = !destino && humanTema ? `Experiencias · ${humanTema}` : null;
  const heroDto = titleOverride ? { ...dto, hero: { ...dto.hero, title: titleOverride } } : dto;
  return (
    <PublicShell
      crumbs={legacyCrumbs}
      contextDeclaration={contextDeclaration}
      useContextCrumbs={!humanTema || !!destino}
      compactCrumbsOnMobile
    >
      <ExperiencesListingSurface
        dto={heroDto}
        attributeAxes={axes}
        attributeValueLabels={valueLabels}
      />
    </PublicShell>
  );
}
