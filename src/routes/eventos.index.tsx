import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { buildDestinationFacet } from "@/components/surfaces/TourismListingSurface";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";

export const Route = createFileRoute("/eventos/")({
  head: () =>
    buildPublicHead({
      title: `Eventos · ${SITE.name}`,
      description: "Fiestas, festivales y celebraciones del calendario maya.",
      path: "/eventos",
    }),
  loader: async () => ({
    dto: await getPublicListing({ data: { family: "eventos", destino: null } }),
  }),
  component: EventosPage,
});

function EventosPage() {
  const { dto } = Route.useLoaderData();
  const destinoFacet = buildDestinationFacet([...dto.items]);
  return (
    <PublicShell crumbs={[{ label: "Eventos" }]}>
      <ListingPremiumSurfaceFromDTO dto={dto} facets={destinoFacet ? [destinoFacet] : []} />
    </PublicShell>
  );
}
