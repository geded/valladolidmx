import { createFileRoute } from "@tanstack/react-router";
import { EditorialRouteEditor } from "@/components/cms/EditorialRouteEditor";

export const Route = createFileRoute("/_authenticated/cms/rutas/$id/editar")({
  head: () => ({
    meta: [{ title: "Editar ruta · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <EditorialRouteEditor id={id} />;
}
