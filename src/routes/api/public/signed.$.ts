/**
 * Entrega de fotos firmadas bajo el dominio propio. Reenvía el token tal
 * cual; el almacenamiento lo valida (caducidad y ruta). Sólo imágenes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { imageTypeFromPath } from "@/lib/media/public-object-response.server";

export const Route = createFileRoute("/api/public/signed/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const splat = String(params._splat ?? "").replace(/^\/+/, "");
        const token = new URL(request.url).searchParams.get("token") ?? "";
        if (!splat || splat.includes("..") || !/^[\w.-]+$/.test(token)) {
          return new Response("Not found", { status: 404 });
        }
        const type = imageTypeFromPath(splat);
        if (!type) return new Response("Not found", { status: 404 });
        const base = process.env.SUPABASE_URL;
        if (!base) return new Response("Media unavailable", { status: 502 });
        const encoded = splat.split("/").map(encodeURIComponent).join("/");
        let upstream: Response;
        try {
          upstream = await fetch(
            `${base}/storage/v1/object/sign/${encoded}?token=${encodeURIComponent(token)}`,
            { redirect: "manual", signal: request.signal },
          );
        } catch {
          return new Response("Media unavailable", { status: 502 });
        }
        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: upstream.status === 400 ? 404 : upstream.status >= 500 ? 502 : 404 });
        }
        const declared = upstream.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
        if (declared && !declared.startsWith("image/") && !declared.includes("octet-stream")) {
          return new Response("Unsupported media", { status: 502 });
        }
        const headers = new Headers({
          "Content-Type": declared?.startsWith("image/") ? declared : type,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Content-Type-Options": "nosniff",
        });
        for (const n of ["ETag", "Last-Modified", "Content-Length"]) {
          const v = upstream.headers.get(n);
          if (v) headers.set(n, v);
        }
        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
