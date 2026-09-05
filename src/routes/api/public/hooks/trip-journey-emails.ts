import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runTripJourneyEmails } from "@/lib/cron/jobs/trip-journey-emails.server";

/**
 * Etapa 8 · Correos del viaje.
 * Cron horario que envía T-14, T-3, bienvenida y T+2 a viajeros con orden
 * confirmada (paid/fulfilled) y viaje asociado.
 *
 * Autenticación (Lote 3M-A): exclusivamente cabecera privada `x-cron-secret`
 * comparada en tiempo constante contra `CRON_HOOKS_SECRET`. Sin `apikey`,
 * sin bearer, sin parámetros de URL. Fail closed si el secreto no existe.
 */
export const Route = createFileRoute("/api/public/hooks/trip-journey-emails")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, runTripJourneyEmails),
    },
  },
});
