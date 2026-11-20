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
import { getPublishedCompositionBySlug } from "@/lib/experience-builder/public-reads.functions";
import { configurePublicDiscoveryRails } from "@/lib/listings/listing-public-contract";

export const Route = createFileRoute("/que-hacer")({
  loader: async () => {
    const [dto, composition] = await Promise.all([
      getPublicListing({ data: { family: "que-hacer", destino: null } }),
      getPublishedCompositionBySlug({ data: { slug: "que-hacer" } }).catch(() => null),
    ]);
    const node = composition?.snapshot.root.children.find(
      (candidate) => candidate.type === "vmx.listing.premium-g5" && !candidate.hidden,
    );
    return { dto: configurePublicDiscoveryRails(dto, node?.config.discovery_rails) };
  },
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
