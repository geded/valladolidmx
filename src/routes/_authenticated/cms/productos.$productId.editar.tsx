import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/cms/ProductEditor";

export const Route = createFileRoute(
  "/_authenticated/cms/productos/$productId/editar",
)({
  head: () => ({
    meta: [
      { title: "Editar producto · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { productId } = Route.useParams();
  return <ProductEditor id={productId} />;
}