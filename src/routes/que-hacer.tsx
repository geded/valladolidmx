/**
 * /que-hacer — Actividades editoriales del Oriente Maya (Sprint 5).
 *
 * Superficie editorial que combina destinos publicados y eventos próximos
 * reutilizando lecturas ya existentes. Sin backend nuevo.
 *
 * @context-engine legacy — editorial sin territorio. Declarada como
 * excepción documentada en I5 y ratificada en I7 (Reconciliation Report
 * §2, fila 6). No monta `ContextEngineProvider`. Sin `previous`
 * relevante, sin herencia y sin necesidad de crumbs consolidados.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";

export const Route = createFileRoute("/que-hacer")({
  loader: async () => ({
    dto: await getPublicListing({ data: { family: "que-hacer", destino: null } }),
  }),
  head: () =>
    buildPublicHead({
      title: `¿Qué hacer? · ${SITE.name}`,
      description:
        "Ideas editoriales para vivir el Oriente Maya: cultura, naturaleza, aventura, gastronomía y eventos.",
      path: "/que-hacer",
    }),
  component: QueHacerRoute,
});

function QueHacerRoute() {
  const { dto } = Route.useLoaderData();
  return (
    <PublicShell
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label: "¿Qué hacer?", to: "/que-hacer" },
      ]}
    >
      <ListingPremiumSurfaceFromDTO dto={dto} showAddToTrip showFavorite />
    </PublicShell>
  );
}
