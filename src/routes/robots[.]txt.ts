/**
 * PR-2 · Infrastructure Externalization.
 *
 * `/robots.txt` dinámico. Deriva el `Sitemap:` directive desde la
 * fuente única de verdad `src/config/site.ts` para que la futura
 * migración a `https://valladolid.mx` sólo requiera cambiar
 * `PUBLIC_DOMAIN` en un único lugar.
 */
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { absoluteUrl } from "@/config/site";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "",
          `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});