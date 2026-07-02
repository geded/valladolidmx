import { createFileRoute } from "@tanstack/react-router";
import { RegionEditor } from "@/components/cms/RegionEditor";

export const Route = createFileRoute("/_authenticated/cms/regiones/$id/editar")({
  head: () => ({
    meta: [
      { title: "Editar región · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <RegionEditor id={id} />;
}
