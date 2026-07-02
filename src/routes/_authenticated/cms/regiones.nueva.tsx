import { createFileRoute } from "@tanstack/react-router";
import { RegionEditor } from "@/components/cms/RegionEditor";

export const Route = createFileRoute("/_authenticated/cms/regiones/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva región · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <RegionEditor />,
});
