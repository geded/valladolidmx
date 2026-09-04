/**
 * G4-PLACES · Listado contextual de Lugares dentro de un destino.
 *
 * `/oriente-maya/{destino}/lugares` — el destino se aplica automáticamente,
 * el contexto queda bloqueado y los lugares de otros destinos se muestran
 * en una sección separada de descubrimiento. Misma autoridad de listado
 * que `/lugares` (cero implementaciones paralelas).
 */
import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";
import { ORIENTE_MAYA } from "@/config/regions";
import { DESTINOS_MOCK } from "@/mocks/destinos";
import { defineRouteContext, type RouteContextDeclaration } from "@/lib/context-engine";

function destinationLabel(slug: string): string {
  return DESTINOS_MOCK.find((d) => d.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

function buildContext(destino: string): RouteContextDeclaration {
  return defineRouteContext({
    current: {
      kind: "category",
      slug: "lugares",
      label: "Lugares y sitios de interés",
      href: `/oriente-maya/${destino}/lugares`,
    },
    ancestors: [
      {
        kind: "region" as const,
        slug: ORIENTE_MAYA.slug,
        label: ORIENTE_MAYA.name,
        href: "/oriente-maya",
      },
      {
        kind: "destination" as const,
        slug: destino,
        label: destinationLabel(destino),
        href: `/oriente-maya/${destino}`,
      },
    ],
    inherit: [],
    canonical: `/oriente-maya/${destino}/lugares`,
  });
}

export const Route = createFileRoute("/oriente-maya/$destino/lugares/")({
  loader: async ({ params }) => {
    const destino = params.destino;
    const [dto, regional] = await Promise.all([
      getPublicListing({ data: { family: "lugares", destino } }),
      getPublicListing({ data: { family: "lugares", destino: null } }),
    ]);
    const nearby = regional.items.filter(
      (item) => !dto.items.some((local) => local.id === item.id),
    );
    return { dto, nearby, destino };
  },
  head: ({ params }) =>
    buildPublicHead({
      title: `Lugares y sitios de interés en ${destinationLabel(params.destino)} · ${SITE.name}`,
      description: `Cenotes, conventos y sitios emblemáticos de ${destinationLabel(params.destino)}, Oriente Maya.`,
      path: `/oriente-maya/${params.destino}/lugares`,
    }),
  component: LugaresDestinoPage,
});

function LugaresDestinoPage() {
  const { dto, nearby, destino } = Route.useLoaderData();
  const label = dto.destinationLabel ?? destinationLabel(destino);
  return (
    <PublicShell
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label, to: `/oriente-maya/${destino}` },
        { label: "Lugares y sitios de interés" },
      ]}
      contextDeclaration={buildContext(destino)}
      useContextCrumbs
      compactCrumbsOnMobile
    >
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        showAddToTrip
        showFavorite
        nearbyItems={nearby}
        lockedDestinationLabel={label}
      />
    </PublicShell>
  );
}
