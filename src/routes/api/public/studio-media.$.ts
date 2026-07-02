/**
 * Proxy público para servir imágenes del bucket privado `studio-media`.
 *
 * El Experience Builder almacena en la composición URLs estables del tipo
 *   /api/public/studio-media/<ruta-en-bucket>
 * y este handler resuelve una URL firmada fresca cada vez que el navegador
 * la solicita. Así:
 *   - El bucket permanece privado (no expone el listado completo).
 *   - Las composiciones publicadas no rompen cuando expira una firma.
 *   - Los editores pueden reemplazar la imagen re-subiendo al mismo path.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/studio-media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = String(params._splat ?? "").replace(/^\/+/, "");
        if (!splat) return new Response("Not found", { status: 404 });
        // Bloqueo defensivo: nunca dejar salir de este bucket lógicamente.
        if (splat.includes("..")) return new Response("Bad path", { status: 400 });

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const storage = (supabaseAdmin as any).storage;
          const { data, error } = await storage
            .from("studio-media")
            .createSignedUrl(splat, 60 * 60); // 1 hora
          if (error || !data?.signedUrl) {
            return new Response("Not found", { status: 404 });
          }
          return new Response(null, {
            status: 302,
            headers: {
              Location: data.signedUrl,
              // Cache corto en CDN; la URL firmada dura 1 h y toleramos que
              // el navegador la reuse un ratito.
              "Cache-Control": "public, max-age=300, s-maxage=300",
            },
          });
        } catch (err) {
          console.error("[studio-media proxy] error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});