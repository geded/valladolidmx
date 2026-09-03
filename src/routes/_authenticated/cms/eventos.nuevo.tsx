import { createFileRoute } from "@tanstack/react-router";
import { EventEditor } from "@/components/cms/EventEditor";

export const Route = createFileRoute("/_authenticated/cms/eventos/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo evento · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <EventEditor />,
});
