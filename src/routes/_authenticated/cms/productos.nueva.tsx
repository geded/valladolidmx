import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/cms/ProductEditor";

export const Route = createFileRoute("/_authenticated/cms/productos/nueva")({
  head: () => ({
    meta: [
      { title: "Nuevo producto · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <ProductEditor />,
});