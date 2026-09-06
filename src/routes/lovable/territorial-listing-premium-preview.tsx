import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";

export const Route = createFileRoute("/lovable/territorial-listing-premium-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    familia: search.familia === "restaurantes" ? ("restaurantes" as const) : ("hoteles" as const),
  }),
  loaderDeps: ({ search }) => ({ familia: search.familia }),
  loader: async ({ deps }) => ({
    dto: await getPublicListing({ data: { family: deps.familia, destino: "valladolid" } }),
  }),
  head: () => ({
    meta: [
      { title: "Listado territorial · Revisión visual" },
      {
        name: "description",
        content: "Maqueta visual responsive del listado territorial de hoteles en Valladolid.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: TerritorialListingPremiumPreview,
});

function TerritorialListingPremiumPreview() {
  const { dto } = Route.useLoaderData();
  return (
    <PublicShell variant="default">
      <ListingPremiumSurfaceFromDTO dto={dto} showAddToTrip showFavorite />
    </PublicShell>
  );
}
