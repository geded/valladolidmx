/**
 * /mapa — Mapa territorial (Sprint 5).
 *
 * @context-engine legacy — herramienta transversal (I7 · fila 10).
 * Candidato a evaluación en H-02 · Épica 2 (posible slot territorial).
 * No monta `ContextEngineProvider` en I7.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import type { Destination } from "@/types/territory";

export const Route = createFileRoute("/mapa")({
  loader: async () => ({ destinos: await listPublishedDestinations().catch(() => [] as Destination[]) }),
  head: () =>
    buildPublicHead({
      title: `Mapa · ${SITE.name}`,
      description: "Explora el territorio del Oriente Maya destino por destino.",
      path: "/mapa",
    }),
  component: MapaRoute,
});

function MapaRoute() {
  const { destinos } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Territorio"
      title="Mapa del Oriente Maya"
      description="Navega los destinos del territorio y descubre qué visitar en cada uno."
      crumbs={[{ label: "Mapa" }]}
    >
      {destinos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Los destinos se están actualizando.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinos.map((d: Destination) => (
            <li key={d.slug}>
              <Link
                to="/oriente-maya/$destino"
                params={{ destino: d.slug }}
                className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-sm font-semibold text-foreground">{d.name}</p>
                {d.tagline ? (
                  <p className="mt-1 text-xs text-muted-foreground">{d.tagline}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}