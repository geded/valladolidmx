import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runVisibilityNotifications } from "@/lib/cron/jobs/visibility-notifications.server";

/**
 * Ola 7.9 · Cron diario de notificaciones de ciclo de vida de visibilidad
 * (recordatorios 7d/24h antes de vencer y aviso de plan vencido).
 *
 * Autenticación (Lote 3M-A): exclusivamente cabecera privada `x-cron-secret`
 * comparada en tiempo constante contra `CRON_HOOKS_SECRET`. Sin `apikey`,
 * sin bearer, sin parámetros de URL. Fail closed si el secreto no existe.
 */
export const Route = createFileRoute("/api/public/hooks/visibility-notifications")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, runVisibilityNotifications),
    },
  },
});
