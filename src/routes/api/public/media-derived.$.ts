/**
 * H3·A4 · Entrega pública de variantes derivadas (`media-derived`).
 *
 * Mismo contrato y misma autoridad que el proxy ya existente
 * `/api/public/studio-media/*`: el bucket permanece privado y aquí se
 * resuelve una URL firmada fresca en cada petición.
 *
 * Reglas Founder aplicadas:
 *   · Sólo se sirven variantes `ready` cuyo asset esté `published` y vigente.
 *   · Estas URLs NO son canónicas (Stable Public Asset Contract): el
 *     `canonical` indexable sigue siendo `/api/public/studio-media/<path>`.
 *   · Ningún consumidor construye estas rutas a mano; las emite
 *     `resolveMediaSource()` a partir de las variantes cargadas en servidor.
 */
import { createFileRoute } from "@tanstack/react-router";

export const DERIVED_MEDIA_PREFIX = "/api/public/media-derived/";

export const Route = createFileRoute("/api/public/media-derived/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const storage = (supabaseAdmin as any).storage;
          const { data, error } = await storage
            .from("media-derived")
            .createSignedUrl(splat, 60 * 60);
          if (error || !data?.signedUrl) return new Response("Not found", { status: 404 });

          return new Response(null, {
            status: 302,
            headers: {
              Location: data.signedUrl,
              "Cache-Control": "public, max-age=300, s-maxage=300",
            },
          });
        } catch (err) {
          console.error("[media-derived proxy] error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
