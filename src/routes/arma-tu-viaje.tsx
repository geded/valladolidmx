/**
 * /arma-tu-viaje — Herramienta transversal (Sprint 5).
 *
 * @context-engine legacy — herramienta transversal sin territorio
 * (I7 · fila 9). No monta `ContextEngineProvider`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { TripPlannerSurface } from "@/components/surfaces/TripPlannerSurface";
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";

interface TripPlannerSearch {
  destination?: string;
  destinationLabel?: string;
}

export const Route = createFileRoute("/arma-tu-viaje")({
  validateSearch: (search: Record<string, unknown>): TripPlannerSearch => {
    const destination =
      typeof search.destination === "string" && /^[a-z0-9-]+$/.test(search.destination)
        ? search.destination
        : undefined;
    const destinationLabel =
      typeof search.destinationLabel === "string" && search.destinationLabel.trim()
        ? search.destinationLabel.trim().slice(0, 80)
        : undefined;
    return {
      ...(destination ? { destination } : {}),
      ...(destinationLabel ? { destinationLabel } : {}),
    };
  },
  loader: async () => {
    const composition = await getPublishedCompositionBySlug({
      data: { slug: "arma-tu-viaje" },
    });
    return { composition };
  },
  head: () =>
    buildPublicHead({
      title: `Arma tu Viaje · ${SITE.name}`,
      description:
        "Tu expediente personal del Oriente Maya. Guarda destinos, experiencias y notas. Tu concierge humano lo recibe cuando estés listo.",
      path: "/arma-tu-viaje",
    }),
  component: AYVPage,
});

/**
 * Lote 3C · Cierre — Fallback seguro: una composición publicada sin
 * bloques renderizables NO puede dejar la página vacía. En ese caso
 * servimos la superficie oficial `TripPlannerSurface`.
 */
function hasRenderableBlocks(tree: unknown): boolean {
  const root = (tree as { root?: { children?: unknown[] } } | null)?.root;
  const children = Array.isArray(root?.children) ? root!.children! : [];
  const stack = [...children];
  let count = 0;
  while (stack.length) {
    const node = stack.pop() as { type?: string; children?: unknown[] } | null;
    if (!node || typeof node !== "object") continue;
    if (typeof node.type === "string" && node.type.trim()) count += 1;
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return count > 0;
}

function AYVPage() {
  const { composition } = Route.useLoaderData();
  const { destination, destinationLabel } = Route.useSearch();
  const snapshot = composition?.snapshot;
  const returnDestination = destination
    ? { slug: destination, label: destinationLabel ?? destination }
    : null;
  const crumbs = returnDestination
    ? [
        { label: "Oriente Maya de Yucatán", to: "/oriente-maya" },
        {
          label: returnDestination.label,
          to: "/oriente-maya/$destino",
          params: { destino: returnDestination.slug },
        },
        { label: "Arma tu Viaje" },
      ]
    : [{ label: "Arma tu Viaje" }];
  return (
    <PublicShell variant="hero" crumbs={crumbs} compactCrumbsOnMobile>
      {composition && snapshot && hasRenderableBlocks(snapshot) ? (
        <CompositionRenderer tree={snapshot} />
      ) : (
        <TripPlannerSurface returnDestination={returnDestination} />
      )}
    </PublicShell>
  );
}
