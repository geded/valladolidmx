/**
 * /mapa — Mapa territorial (Sprint 5).
 *
 * @context-engine legacy — herramienta transversal (I7 · fila 10).
 * Candidato a evaluación en H-02 · Épica 2 (posible slot territorial).
 * No monta `ContextEngineProvider` en I7.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { TerritoryMapExplorer } from "@/components/discovery/TerritoryMapExplorer";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import type { Destination } from "@/types/territory";

export const Route = createFileRoute("/mapa")({
  loader: async () => ({
    destinos: await listPublishedDestinations().catch(() => [] as Destination[]),
  }),
  head: () =>
    buildPublicHead({
      title: `Mapa · ${SITE.name}`,
      description: "Explora el territorio del Oriente Maya destino por destino.",
      path: "/mapa",
      // SEO.A1.1 · PR-1 · Founder Decision — /mapa NO se indexa.
      // La superficie es funcional (navegación al territorio) y no
      // aporta contenido editorial independiente. Permanece descubrible
      // sólo por navegación interna.
      noindex: true,
    }),
  component: MapaRoute,
});

function MapaRoute() {
  const { destinos } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Territorio"
      title="Mapa del Oriente Maya"
      description="Reconoce el territorio: caminos, distancias y tiempos reales entre los destinos del Oriente Maya."
      crumbs={[{ label: "Oriente Maya", to: "/oriente-maya" }, { label: "Mapa" }]}
      compactCrumbsOnMobile
    >
      {destinos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Los destinos se están actualizando.</p>
      ) : (
        <TerritoryMapExplorer destinations={destinos as Destination[]} />
      )}
    </PublicShell>
  );
}
