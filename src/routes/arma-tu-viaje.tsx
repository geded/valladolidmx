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

export const Route = createFileRoute("/arma-tu-viaje")({
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

function AYVPage() {
  const { composition } = Route.useLoaderData();
  return (
    <PublicShell
      eyebrow="Plataforma"
      title="Arma tu Viaje"
      description="No es un carrito de compras. Es tu expediente personal. Cuando estés listo, lo recibe tu concierge humano."
      crumbs={[{ label: "Arma tu Viaje" }]}
    >
      {composition ? (
        <CompositionRenderer tree={composition.snapshot} />
      ) : (
        <TripPlannerSurface />
      )}
    </PublicShell>
  );
}
