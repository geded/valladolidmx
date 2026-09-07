/** Preview autenticado de portada temporal; nunca persiste la asociación. */
import { createFileRoute } from "@tanstack/react-router";
import { EventPremiumSurface } from "@/components/surfaces/EventPremiumSurface";
import { resolveSafeEventCoverPreview } from "@/lib/experience-builder/studio-media.functions";

export const Route = createFileRoute("/_authenticated/cms/eventos/$eventId/portada-preview")({
  validateSearch: (search: Record<string, unknown>): { mediaId: string } => ({
    mediaId: typeof search.mediaId === "string" ? search.mediaId : "",
  }),
  loaderDeps: ({ search }) => ({ mediaId: search.mediaId }),
  loader: async ({ params, deps }) => {
    if (!deps.mediaId) throw new Error("media_id_required");
    return resolveSafeEventCoverPreview({
      data: { eventId: params.eventId, mediaId: deps.mediaId },
    });
  },
  head: () => ({
    meta: [
      { title: "Portada temporal · Preview seguro de evento" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: SafeEventCoverPreview,
});

function SafeEventCoverPreview() {
  const event = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-[80] border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-950">
        Preview seguro · portada IA conceptual temporal · no asociada · no publicada
      </div>
      <EventPremiumSurface event={event} />
    </div>
  );
}
