import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/cms/studio-media-preview/$mediaId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!token || token.split(".").length !== 3 || !url || !key) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return new Response("Unauthorized", { status: 401 });
        const { data: allowed, error: roleError } = await supabase.rpc("is_editor_or_admin", {
          _user_id: userId,
        });
        if (roleError || !allowed) return new Response("Forbidden", { status: 403 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: media, error: mediaError } = await supabaseAdmin
          .from("media_assets")
          .select("storage_bucket, storage_path, status, review_state, metadata, mime_type")
          .eq("id", params.mediaId)
          .is("deleted_at", null)
          .maybeSingle();
        if (mediaError || !media || media.storage_bucket !== "studio-media") {
          return new Response("Not found", { status: 404 });
        }
        const metadata = (
          media.metadata && typeof media.metadata === "object" ? media.metadata : {}
        ) as {
          rights?: { nature?: unknown; ai_generated?: unknown; documentary?: unknown };
          lifecycle?: { temporary?: unknown; production_eligible?: unknown; usage?: unknown };
        };
        const rights = metadata.rights ?? {};
        const lifecycle = metadata.lifecycle ?? {};
        const previewOnly =
          media.status === "draft" &&
          media.review_state !== "approved" &&
          rights.nature === "ai_generated" &&
          rights.ai_generated === true &&
          rights.documentary !== true &&
          lifecycle.temporary === true &&
          lifecycle.production_eligible === false &&
          lifecycle.usage === "preview_only";
        if (!previewOnly) return new Response("Not found", { status: 404 });

        const { data: blob, error: downloadError } = await supabaseAdmin.storage
          .from("studio-media")
          .download(media.storage_path);
        if (downloadError || !blob) return new Response("Not found", { status: 404 });
        return new Response(blob, {
          headers: {
            "Content-Type": media.mime_type || blob.type || "application/octet-stream",
            "Cache-Control": "private, no-store, max-age=0",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        });
      },
    },
  },
});
