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

// Marker adicional: "kind:LABEL:lat,lng" o "kind:lat,lng" (legacy).
const MARKER_RE =
  /^(poi|business|product|event|destination)(?::([A-Z0-9]))?:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;
/* Pines con la paleta de marca (oro / selva), igual que el mapa interactivo. */
const MARKER_COLORS: Record<string, string> = {
  business: "0xeaa840",
  product: "0xd97706",
  event: "0x7c3aed",
  destination: "0x234933",
  poi: "0xeaa840",
};

/* Cartografía territorial Valladolid.mx para la imagen fija: misma paleta
   crema / selva / oro del mapa interactivo y sin rótulos comerciales,
   médicos ni escolares de Google que compiten con nuestras paradas. */
const BRAND_STATIC_STYLES = [
  "element:geometry|color:0xece4d3",
  "element:labels.text.fill|color:0x234933",
  "element:labels.text.stroke|color:0xffffff",
  "feature:administrative|element:geometry.stroke|color:0xb4b9a6",
  "feature:landscape.natural|element:geometry|color:0xe4dece",
  "feature:landscape.man_made|element:geometry|color:0xf6f3eb",
  "feature:poi|element:geometry|color:0xd8d5c3",
  "feature:poi.business|element:labels|visibility:off",
  "feature:poi.medical|element:labels|visibility:off",
  "feature:poi.school|element:labels|visibility:off",
  "feature:poi.park|element:geometry|color:0xbcbfad",
  "feature:road|element:geometry|color:0xffffff",
  "feature:road|element:geometry.stroke|color:0xc4c5b3",
  "feature:road.highway|element:geometry|color:0xeaa840",
  "feature:road.highway|element:geometry.stroke|color:0xb8903d",
  "feature:road.highway|element:labels.text.fill|color:0x234933",
  "feature:transit|element:labels|visibility:off",
  "feature:water|element:geometry|color:0x8fc4cf",
  "feature:water|element:labels.text.fill|color:0x057c94",
];

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
        const rawMarkers = url.searchParams.getAll("m").slice(0, 40);

        const gw = new URL("https://connector-gateway.lovable.dev/google_maps/maps/api/staticmap");
        gw.searchParams.set("center", `${lat},${lng}`);
        gw.searchParams.set("zoom", String(zoom));
        gw.searchParams.set("size", `${width}x${height}`);
        gw.searchParams.set("scale", String(scale));
        gw.searchParams.set("format", format);
        gw.searchParams.set("maptype", "roadmap");
        for (const style of BRAND_STATIC_STYLES) gw.searchParams.append("style", style);
        if (rawMarkers.length === 0) {
          gw.searchParams.append("markers", `color:${MARKER_COLORS.poi}|size:mid|${lat},${lng}`);
        } else {
          // Un `markers=` por pin para preservar la etiqueta individual.
          for (const raw of rawMarkers) {
            const m = MARKER_RE.exec(raw);
            if (!m) continue;
            const kind = m[1];
            const label = m[2] ?? "";
            const coord = `${m[3]},${m[4]}`;
            const color = MARKER_COLORS[kind] ?? MARKER_COLORS.poi;
            const parts = [`color:${color}`, "size:mid"];
            if (label) parts.push(`label:${label}`);
            parts.push(coord);
            gw.searchParams.append("markers", parts.join("|"));
          }
        }

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
          upstream.headers.get("Content-Type") ?? (format === "png" ? "image/png" : "image/jpeg");

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=1800, s-maxage=1800",
          },
        });
      },
    },
  },
});
