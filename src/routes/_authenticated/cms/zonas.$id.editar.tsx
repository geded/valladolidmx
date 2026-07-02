import { createFileRoute } from "@tanstack/react-router";
import { ZoneEditor } from "@/components/cms/ZoneEditor";

export const Route = createFileRoute("/_authenticated/cms/zonas/$id/editar")({
  head: () => ({
    meta: [
      { title: "Editar zona · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ZoneEditor id={id} />;
}