import { createFileRoute } from "@tanstack/react-router";
import { DestinationEditor } from "@/components/cms/DestinationEditor";

export const Route = createFileRoute("/_authenticated/cms/destinos/$destinationId/editar")({
  head: () => ({
    meta: [
      { title: "Editar destino · CMS Studio" },
      { name: "description", content: "Edición de contenido, ubicación y fotografías acreditadas de destinos en Valladolid.mx." },
      { property: "og:title", content: "Editar destino · Valladolid.mx CMS Studio" },
      { property: "og:description", content: "Gestión editorial de destinos y derechos de sus fotografías en Valladolid.mx." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { destinationId } = Route.useParams();
  return <DestinationEditor id={destinationId} />;
}
