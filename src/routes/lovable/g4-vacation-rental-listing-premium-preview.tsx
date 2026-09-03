import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { TerritorialListingReviewSurface } from "@/components/listing-premium/TerritorialListingReviewSurface";

export const Route = createFileRoute("/lovable/g4-vacation-rental-listing-premium-preview")({
  head: () => ({
    meta: [
      { title: "Casas de vacaciones en Valladolid · Revisión visual" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: VacationRentalListingPremiumPreview,
});

function VacationRentalListingPremiumPreview() {
  return (
    <PublicShell variant="default">
      <TerritorialListingReviewSurface family="casas-de-vacaciones" />
    </PublicShell>
  );
}
