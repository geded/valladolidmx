import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runCouponReviewReminders } from "@/lib/cron/jobs/coupon-review-reminders.server";

/**
 * Ola 6.1 · Cron horario que envía recordatorios de reseña a viajeros que
 * canjearon un cupón y aún no han dejado reseña.
 *
 * Autenticación (Lote 3M-A): exclusivamente cabecera privada `x-cron-secret`
 * comparada en tiempo constante contra `CRON_HOOKS_SECRET`. Sin `apikey`,
 * sin bearer, sin parámetros de URL. Fail closed si el secreto no existe.
 */
export const Route = createFileRoute("/api/public/hooks/coupon-review-reminders")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, runCouponReviewReminders),
    },
  },
});
