import { createFileRoute } from "@tanstack/react-router";
import { BusinessEditor } from "@/components/cms/BusinessEditor";

export const Route = createFileRoute(
  "/_authenticated/cms/empresas/$businessId/editar",
)({
  head: () => ({
    meta: [
      { title: "Editar empresa · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { businessId } = Route.useParams();
  return <BusinessEditor id={businessId} />;
}