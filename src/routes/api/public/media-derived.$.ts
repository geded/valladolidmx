/**
 * H3·A4 · Entrega pública de variantes derivadas (`media-derived`).
 * Sólo variantes ready de assets publicados y vigentes. La URL canónica
 * sigue siendo studio-media; estas URLs no canónicas tampoco revelan la
 * dirección firmada del almacenamiento al navegador.
 */
import { createFileRoute } from "@tanstack/react-router";

export const DERIVED_MEDIA_PREFIX = "/api/public/media-derived/";

export const Route = createFileRoute("/api/public/media-derived/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const splat = String(params._splat ?? "").replace(/^\/+/, "");
        if (!splat) return new Response("Not found", { status: 404 });
        if (splat.includes("..")) return new Response("Bad path", { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: variant, error: variantError } = await supabaseAdmin
            .from("media_asset_variants")
            .select("id, asset_id, bucket, path, status, format")
            .eq("bucket", "media-derived")
            .eq("path", splat)
            .eq("status", "ready")
            .maybeSingle();
          if (variantError || !variant) return new Response("Not found", { status: 404 });

          const { data: asset, error: assetError } = await supabaseAdmin
            .from("media_assets")
            .select("id")
            .eq("id", variant.asset_id)
            .eq("status", "published")
            .is("deleted_at", null)
            .maybeSingle();
          if (assetError || !asset) return new Response("Not found", { status: 404 });

          const { publicMediaObjectResponse } =
            await import("@/lib/media/public-object-response.server");
          return await publicMediaObjectResponse({ bucket: "media-derived", path: splat, request });
        } catch (err) {
          console.error("[media-derived proxy] error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
