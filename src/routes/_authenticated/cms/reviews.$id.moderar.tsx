import { createFileRoute } from "@tanstack/react-router";
import { ReviewModerator } from "@/components/cms/ReviewModerator";

export const Route = createFileRoute("/_authenticated/cms/reviews/$id/moderar")({
  head: () => ({
    meta: [
      { title: "Moderar reseña · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ReviewModerator id={id} />;
}
