import { createFileRoute } from "@tanstack/react-router";
import { PlaceEditor } from "@/components/cms/places/PlaceEditor";

export const Route = createFileRoute("/_authenticated/cms/lugares/$placeId/editar")({
  head: () => ({
    meta: [
      { title: "Editar lugar · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { placeId } = Route.useParams();
  return <PlaceEditor placeId={placeId} />;
}
