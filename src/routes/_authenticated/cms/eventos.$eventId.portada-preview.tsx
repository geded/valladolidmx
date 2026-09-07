/** Preview autenticado de portada temporal; nunca persiste la asociación. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EventPremiumSurface } from "@/components/surfaces/EventPremiumSurface";
import { resolveSafeEventCoverPreview } from "@/lib/experience-builder/studio-media.functions";
import { supabase } from "@/integrations/supabase/client";

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
  const { mediaId } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-[80] border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-950">
        Preview seguro · portada IA conceptual temporal · no asociada · no publicada
      </div>
      <EventPremiumSurface
        event={event}
        readOnlyPreview
        previewCover={<AuthenticatedPreviewCover mediaId={mediaId} alt={event.title} />}
      />
    </div>
  );
}

function AuthenticatedPreviewCover({ mediaId, alt }: { mediaId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const token = data.session?.access_token;
        if (!token) throw new Error("preview_auth_required");
        const response = await fetch(
          `/api/cms/studio-media-preview/${encodeURIComponent(mediaId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("preview_media_unavailable");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  if (failed) {
    return (
      <div
        role="alert"
        className="flex h-56 items-center justify-center rounded-3xl bg-[#efe8da] text-sm text-[#667067] sm:h-72 lg:h-[26rem]"
      >
        No fue posible cargar la portada temporal.
      </div>
    );
  }
  if (!src) {
    return (
      <div
        aria-label="Cargando portada temporal"
        className="h-56 animate-pulse rounded-3xl bg-[#efe8da] sm:h-72 lg:h-[26rem]"
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-56 w-full rounded-3xl object-cover shadow-elevated sm:h-72 lg:h-[26rem]"
    />
  );
}
