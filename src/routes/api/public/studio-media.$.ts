/**
 * Entrega pública canónica de imágenes del bucket privado `studio-media`.
 * La URL estable no cambia; el servidor obtiene y entrega los bytes sin
 * revelar al navegador la URL firmada del almacenamiento.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/studio-media/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const splat = String(params._splat ?? "").replace(/^\/+/, "");
        if (!splat) return new Response("Not found", { status: 404 });
        if (splat.includes("..")) return new Response("Bad path", { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Los borradores o material retirado permanecen privados.
          const { data: asset, error: assetError } = await supabaseAdmin
            .from("media_assets")
            .select("id")
            .eq("storage_bucket", "studio-media")
            .eq("storage_path", splat)
            .eq("status", "published")
            .is("deleted_at", null)
            .maybeSingle();
          if (assetError || !asset) return new Response("Not found", { status: 404 });

          const { publicMediaObjectResponse } =
            await import("@/lib/media/public-object-response.server");
          return await publicMediaObjectResponse({ bucket: "studio-media", path: splat, request });
        } catch (err) {
          console.error("[studio-media proxy] error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
