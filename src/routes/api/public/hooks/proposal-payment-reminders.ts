import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runProposalPaymentReminders } from "@/lib/cron/jobs/proposal-payment-reminders.server";

/**
 * Recordatorios de pago de propuestas aceptadas.
 * Cron horario: avisa al viajero a la hora, a las 24 h y a las 72 h de haber
 * aceptado sin pagar, y a las 72 h avisa también al equipo interno.
 *
 * Autenticación: exclusivamente cabecera privada `x-cron-secret` comparada en
 * tiempo constante contra `CRON_HOOKS_SECRET`. Fail closed.
 */
export const Route = createFileRoute("/api/public/hooks/proposal-payment-reminders")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, runProposalPaymentReminders),
    },
  },
});
