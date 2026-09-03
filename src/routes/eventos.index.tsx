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

/** Contexto territorial: el destino se hereda o se declara, nunca se pide. */
function buildEventosContext(destino: string | undefined): RouteContextDeclaration {
  const explicitAncestors = destino
    ? [
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
      ]
    : [];
  return defineRouteContext({
    current: { kind: "category", slug: "eventos", label: "Eventos", href: "/eventos" },
    ancestors: explicitAncestors,
    inherit: destino ? [] : ["region", "destination"],
    canonical: "/eventos",
  });
}

export const Route = createFileRoute("/eventos/")({
  validateSearch: (search: Record<string, unknown>): { destino?: string } =>
    typeof search.destino === "string" && search.destino ? { destino: search.destino } : {},
  loaderDeps: ({ search }) => ({ destino: search.destino }),

  head: () =>
    buildPublicHead({
      title: `Eventos · ${SITE.name}`,
      description: "Fiestas, festivales y celebraciones del calendario maya.",
      path: "/eventos",
    }),
  loader: async ({ deps }) => {
    const destino = deps.destino ?? null;
    const [dto, regional] = await Promise.all([
      getPublicListing({ data: { family: "eventos", destino } }),
      destino
        ? getPublicListing({ data: { family: "eventos", destino: null } })
        : Promise.resolve(null),
    ]);
    // Descubrimiento: eventos de otros destinos, jamás mezclados en el
    // conteo local del destino activo.
    const nearby = regional
      ? regional.items.filter((item) => !dto.items.some((local) => local.id === item.id))
      : [];
    return { dto, nearby, destino };
  },
  component: EventosPage,
});

function EventosPage() {
  const { dto, nearby, destino } = Route.useLoaderData();
  const label = destino ? (dto.destinationLabel ?? destinationLabel(destino)) : null;
  const crumbs = [{ label: "Eventos", to: "/eventos" }, ...(label ? [{ label }] : [])];
  return (
    <PublicShell crumbs={crumbs} contextDeclaration={buildEventosContext(destino ?? undefined)} useContextCrumbs>
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
