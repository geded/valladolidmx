/**
 * G8 · Atlas de Destinos del Oriente Maya — superficie pública real.
 *
 * `/oriente-maya/destinos` (ruta estática, precede a `$destino`).
 * Reutiliza el shell global, la plantilla maestra `DestinationsAtlasSurface`
 * y los destinos publicados del CMS. Sin fixtures: los destinos sin dato
 * simplemente no muestran proximidad.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { DestinationsAtlasSurface } from "@/components/destination-premium/DestinationsAtlasSurface";
import { DESTINATIONS_ATLAS_CONTENT } from "@/components/destination-premium/destinations-atlas-content";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { ORIENTE_MAYA } from "@/config/regions";

export const Route = createFileRoute("/oriente-maya/destinos")({
  loader: async () => ({ destinations: await listPublishedDestinations() }),
  head: () =>
    buildPublicHead({
      title: `Destinos del Oriente Maya de Yucatán · ${SITE.name}`,
      description:
        "Atlas de destinos del Oriente Maya: pueblos con historia, cenotes, zonas arqueológicas, comunidades mayas y costa, con Valladolid como punto de partida.",
      path: "/oriente-maya/destinos",
    }),
  component: DestinosAtlasPage,
});

function DestinosAtlasPage() {
  const { destinations } = Route.useLoaderData();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: DESTINATIONS_ATLAS_CONTENT.hero.title,
    description: DESTINATIONS_ATLAS_CONTENT.hero.description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: destinations.length,
      itemListElement: destinations.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: d.name,
        url: `${SITE.url}/oriente-maya/${d.slug}`,
      })),
    },
  };

  return (
    <PublicShell
      variant="hero"
      crumbs={[
        { label: ORIENTE_MAYA.name, to: "/oriente-maya" },
        { label: "Destinos" },
      ]}
      compactCrumbsOnMobile
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <DestinationsAtlasSurface destinations={destinations} />
    </PublicShell>
  );
}
