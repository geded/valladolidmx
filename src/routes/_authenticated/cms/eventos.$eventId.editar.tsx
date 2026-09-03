import { createFileRoute } from "@tanstack/react-router";
import { EventEditor } from "@/components/cms/EventEditor";

export const Route = createFileRoute("/_authenticated/cms/eventos/$eventId/editar")({
  head: () => ({
    meta: [
      { title: "Editar evento · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditarEventoPage,
});

function EditarEventoPage() {
  const { eventId } = Route.useParams();
  return <EventEditor id={eventId} />;
}
