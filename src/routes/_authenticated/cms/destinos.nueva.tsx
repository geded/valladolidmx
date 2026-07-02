import { createFileRoute } from "@tanstack/react-router";
import { DestinationEditor } from "@/components/cms/DestinationEditor";

export const Route = createFileRoute("/_authenticated/cms/destinos/nueva")({
  head: () => ({
    meta: [
      { title: "Nuevo destino · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <DestinationEditor />,
});