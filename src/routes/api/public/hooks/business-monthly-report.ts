import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runBusinessMonthlyReport } from "@/lib/cron/jobs/business-monthly-report.server";

/**
 * Fase A · Gancho diario del reporte mensual gratis de cada empresa. El
 * trabajo decide si hoy toca mandarlo y nunca lo repite en el mismo mes.
 * Autenticación: sólo la cabecera privada `x-cron-secret` (fail closed).
 */
export const Route = createFileRoute("/api/public/hooks/business-monthly-report")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, (supabase, ctx) => runBusinessMonthlyReport(supabase, ctx)),
    },
  },
});
