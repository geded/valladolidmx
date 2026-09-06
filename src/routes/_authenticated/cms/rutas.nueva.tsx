import { createFileRoute } from "@tanstack/react-router";
import { EditorialRouteEditor } from "@/components/cms/EditorialRouteEditor";

export const Route = createFileRoute("/_authenticated/cms/rutas/nueva")({
  head: () => ({
    meta: [{ title: "Nueva ruta · CMS Studio" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => <EditorialRouteEditor />,
});
