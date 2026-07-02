import { createFileRoute } from "@tanstack/react-router";
import { ZoneEditor } from "@/components/cms/ZoneEditor";

export const Route = createFileRoute("/_authenticated/cms/zonas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva zona · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <ZoneEditor />,
});