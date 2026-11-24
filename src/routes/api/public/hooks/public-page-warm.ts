import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";

/**
 * Calentador de páginas públicas (cada 10 min): mantiene lista la copia
 * compartida de Inicio, destinos, listados y fichas.
 * Autenticación: sólo la cabecera privada `x-cron-secret` (fail closed).
 */
export const Route = createFileRoute("/api/public/hooks/public-page-warm")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleCronHook(request, async (_sb, ctx) => (await import("@/lib/cron/jobs/public-page-warm.server")).runPublicPageWarm(new URL(request.url).origin, ctx)),
    },
  },
});
