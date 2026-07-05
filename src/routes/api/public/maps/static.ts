/**
 * /api/public/maps/static — Proxy de Static Maps API.
 *
 * Renderiza el mapa server-side vía gateway y devuelve el PNG al
 * navegador. Beneficios:
 *  - No expone la browser key (evita restricciones de referrer en
 *    dominios custom como quehacerenvalladolid.com).
 *  - Cacheable en CDN por 1 día (coordenadas son estables).
 *  - Se usa como <img src="/api/public/maps/static?lat=..&lng=..">.
 *
 * Validación estricta de parámetros para evitar SSRF/abuso de key.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Query = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  zoom: z.coerce.number().int().gte(1).lte(20).default(15),
  width: z.coerce.number().int().gte(100).lte(640).default(600),
  height: z.coerce.number().int().gte(100).lte(640).default(300),
  scale: z.coerce.number().int().min(1).max(2).default(2),
  format: z.enum(["png", "jpg"]).default("png"),
});

export const Route = createFileRoute("/api/public/maps/static")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        const gmKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!lovableKey || !gmKey) {
          return new Response("Maps credentials missing", { status: 500 });
        }

        const url = new URL(request.url);
        const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return new Response("Invalid parameters", { status: 400 });
        }
        const { lat, lng, zoom, width, height, scale, format } = parsed.data;

        const gw = new URL(
          "https://connector-gateway.lovable.dev/google_maps/maps/api/staticmap",
        );
        gw.searchParams.set("center", `${lat},${lng}`);
        gw.searchParams.set("zoom", String(zoom));
        gw.searchParams.set("size", `${width}x${height}`);
        gw.searchParams.set("scale", String(scale));
        gw.searchParams.set("format", format);
        gw.searchParams.set("maptype", "roadmap");
        gw.searchParams.set(
          "markers",
          `color:red|size:mid|${lat},${lng}`,
        );

        const upstream = await fetch(gw, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": gmKey,
          },
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Static map failed", {
            status: upstream.status || 502,
          });
        }

        const contentType =
          upstream.headers.get("Content-Type") ??
          (format === "png" ? "image/png" : "image/jpeg");

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      },
    },
  },
});