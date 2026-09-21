import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";
import { runUncEmailDispatch } from "@/lib/cron/jobs/unc-email-dispatch.server";

/**
 * UNC · Gancho cron que despacha por correo las entregas pendientes del
 * Delivery Ledger. Autorización: cabecera privada `x-cron-secret` contra
 * `CRON_HOOKS_SECRET` (Lote 3M-A). Fail closed.
 */
export const Route = createFileRoute("/api/public/hooks/unc-email-dispatch")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, runUncEmailDispatch),
    },
  },
});
