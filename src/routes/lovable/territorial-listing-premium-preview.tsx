import { createFileRoute } from "@tanstack/react-router";
import { TerritorialListingReviewSurface } from "@/components/listing-premium/TerritorialListingReviewSurface";

export const Route = createFileRoute("/lovable/territorial-listing-premium-preview")({
  head: () => ({
    meta: [
      { title: "Hoteles en Valladolid · Revisión visual" },
      { name: "description", content: "Maqueta visual responsive del listado territorial de hoteles en Valladolid." },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: TerritorialListingPremiumPreview,
});

function TerritorialListingPremiumPreview() {
  return <TerritorialListingReviewSurface />;
}
