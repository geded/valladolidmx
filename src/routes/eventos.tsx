import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { buildPublicHead } from "@/lib/discovery/seo";
import { SITE } from "@/config/site";
import { listPublishedEvents, type PublicEventCard } from "@/lib/events/public-reads.functions";
import {
  TourismListingSurface,
  buildDestinationFacet,
} from "@/components/surfaces/TourismListingSurface";
import { eventToTourismCard } from "@/lib/experience-builder/adapters/tourism-listing-adapters";

export const Route = createFileRoute("/eventos")({
  head: () =>
    buildPublicHead({
      title: `Eventos · ${SITE.name}`,
      description: "Fiestas, festivales y celebraciones del calendario maya.",
      path: "/eventos",
    }),
  loader: async () => {
    const events = await listPublishedEvents({ data: { upcomingOnly: true, limit: 60 } }).catch(() => []);
    return { events };
  },
  component: EventosPage,
});

function EventosPage() {
  const { events } = Route.useLoaderData() as { events: PublicEventCard[] };
  const cards = events.map(eventToTourismCard);
  const destinoFacet = buildDestinationFacet(cards);
  return (
    <PublicShell crumbs={[{ label: "Eventos" }]}>
      <TourismListingSurface
        hero={{
          eyebrow: "Agenda cultural",
          title: "Eventos",
          subtitle: "Fiestas, festivales y celebraciones del calendario maya.",
        }}
        items={cards}
        facets={destinoFacet ? [destinoFacet] : []}
        emptyMessage="Aún no hay eventos publicados. Estamos armando el calendario de fiestas, festivales y celebraciones."
      />
    </PublicShell>
  );
}
