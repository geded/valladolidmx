import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";

export const Route = createFileRoute("/lovable/g4-restaurant-listing-premium-preview")({
  loader: async () => ({
    dto: await getPublicListing({ data: { family: "restaurantes", destino: "valladolid" } }),
  }),
  head: () => ({
    meta: [
      { title: "Restaurantes en Valladolid · Revisión visual" },
      {
        name: "description",
        content: "Maqueta visual responsive del listado territorial de restaurantes en Valladolid.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: RestaurantListingPremiumPreview,
});

function RestaurantListingPremiumPreview() {
  const { dto } = Route.useLoaderData();
  return (
    <PublicShell variant="default">
      <ListingPremiumSurfaceFromDTO dto={dto} showAddToTrip showFavorite />
    </PublicShell>
  );
}
