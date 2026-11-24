import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runPublicPageWarm } from "@/lib/cron/jobs/public-page-warm.server";

/**
 * Calentador de páginas públicas (cada 10 min): mantiene lista la copia
 * compartida de Inicio, destinos, listados y fichas.
 * Autenticación: sólo la cabecera privada `x-cron-secret` (fail closed).
 */
export const Route = createFileRoute("/api/public/hooks/public-page-warm")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleCronHook(request, (_sb, ctx) => runPublicPageWarm(new URL(request.url).origin, ctx)),
    },
  },
});
