import { createFileRoute } from "@tanstack/react-router";
import { PlaceEditor } from "@/components/cms/places/PlaceEditor";

export const Route = createFileRoute("/_authenticated/cms/lugares/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo lugar · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <PlaceEditor />,
});
