import { createFileRoute } from "@tanstack/react-router";
import { DestinationEditor } from "@/components/cms/DestinationEditor";

export const Route = createFileRoute(
  "/_authenticated/cms/destinos/$destinationId/editar",
)({
  head: () => ({
    meta: [
      { title: "Editar destino · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { destinationId } = Route.useParams();
  return <DestinationEditor id={destinationId} />;
}