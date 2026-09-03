import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { TerritorialListingReviewSurface } from "@/components/listing-premium/TerritorialListingReviewSurface";

export const Route = createFileRoute("/lovable/g4-restaurant-listing-premium-preview")({
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
  return (
    <PublicShell variant="default">
      <TerritorialListingReviewSurface family="restaurantes" />
    </PublicShell>
  );
}
