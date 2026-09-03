import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { TerritorialListingReviewSurface } from "@/components/listing-premium/TerritorialListingReviewSurface";

export const Route = createFileRoute("/lovable/g4-event-listing-premium-preview")({
  head: () => ({
    meta: [
      { title: "Eventos en Valladolid · Revisión visual" },
      { name: "description", content: "Maqueta visual responsive del listado territorial de eventos." },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: EventListingPremiumPreview,
});

function EventListingPremiumPreview() {
  return (
    <PublicShell variant="default">
      <TerritorialListingReviewSurface family="eventos" />
    </PublicShell>
  );
}
