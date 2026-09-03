import { createFileRoute } from "@tanstack/react-router";
import { TerritorialListingReviewSurface } from "@/components/listing-premium/TerritorialListingReviewSurface";
import { PublicShell } from "@/components/discovery";

export const Route = createFileRoute("/lovable/territorial-listing-premium-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    familia: search.familia === "restaurantes" ? ("restaurantes" as const) : ("hoteles" as const),
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
  const { familia } = Route.useSearch();
  return (
    <PublicShell variant="default">
      <TerritorialListingReviewSurface family={familia} />
    </PublicShell>
  );
}
