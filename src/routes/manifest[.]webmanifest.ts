/**
 * PR-2 · Infrastructure Externalization.
 *
 * `/manifest.webmanifest` dinámico. `name`, `short_name`, `description`
 * y `theme_color` se derivan de la fuente única de verdad
 * `src/config/site.ts`. `start_url` / `scope` permanecen relativos
 * ("/") por diseño PWA — el navegador los resuelve contra el origen
 * donde se sirve el manifest, por lo que son inmunes al cambio de
 * dominio y no requieren tocar este archivo en la futura migración.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE } from "@/config/site";

export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: () => {
        const manifest = {
          name: `${SITE.name} — Oriente Maya`,
          short_name: SITE.name,
          description:
            "Descubre el Oriente Maya de Yucatán: Valladolid, Río Lagartos, Izamal, Las Coloradas, Uayma y Ek Balam.",
          start_url: "/",
          id: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          lang: "es-MX",
          dir: "ltr",
          background_color: "#FBF7EE",
          theme_color: SITE.theme_color,
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
          categories: ["travel", "lifestyle"],
        };
        return new Response(JSON.stringify(manifest, null, 2), {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=600",
          },
        });
      },
    },
  },
});
