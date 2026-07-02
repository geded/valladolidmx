import { createFileRoute } from "@tanstack/react-router";
import { BusinessEditor } from "@/components/cms/BusinessEditor";

export const Route = createFileRoute("/_authenticated/cms/empresas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva empresa · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <BusinessEditor />,
});