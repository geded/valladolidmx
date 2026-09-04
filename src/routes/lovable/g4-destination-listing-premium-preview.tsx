/**
 * Preview interna (noindex) del Atlas de Destinos del Oriente Maya.
 *
 * Datos reales del CMS + fixtures de proximidad rotulados "Datos de prueba"
 * exclusivos de esta superficie de revisión.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { DestinationsAtlasSurface } from "@/components/destination-premium/DestinationsAtlasSurface";
import { resolveDestinationsAtlasContent } from "@/components/destination-premium/destinations-atlas-content";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";

/** Fixtures de revisión: km/min aproximados desde Valladolid. Sólo preview. */
const FIXTURE_PROXIMITY: Record<string, { km: number; minutes: number }> = {
  izamal: { km: 75, minutes: 95 },
  espita: { km: 45, minutes: 55 },
  tizimin: { km: 52, minutes: 60 },
  "rio-lagartos": { km: 105, minutes: 130 },
  "las-coloradas": { km: 118, minutes: 145 },
  "el-cuyo": { km: 150, minutes: 180 },
  "san-felipe": { km: 112, minutes: 138 },
};

export const Route = createFileRoute("/lovable/g4-destination-listing-premium-preview")({
  loader: async () => ({ destinations: await listPublishedDestinations() }),
  head: () => ({
    meta: [
      { title: "Atlas de Destinos · Revisión visual" },
      {
        name: "description",
        content:
          "Revisión responsive de la plantilla maestra del listado de destinos del Oriente Maya.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: DestinationListingPremiumPreview,
});

function DestinationListingPremiumPreview() {
  const { destinations } = Route.useLoaderData();
  return (
    <PublicShell
      variant="hero"
      crumbs={[{ label: "Oriente Maya", to: "/oriente-maya" }, { label: "Destinos" }]}
      compactCrumbsOnMobile
    >
      <DestinationsAtlasSurface
        destinations={destinations}
        content={resolveDestinationsAtlasContent()}
        fixtureProximity={FIXTURE_PROXIMITY}
        fixtureNotice="Datos de prueba · distancias de revisión, no oficiales"
      />
    </PublicShell>
  );
}
