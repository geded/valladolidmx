import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";

/**
 * Revisión de respaldo de cada hora del CRM por WhatsApp: reintenta avisos
 * pendientes. Autenticación: sólo la cabecera privada `x-cron-secret`.
 */
export const Route = createFileRoute("/api/public/hooks/crm-whatsapp")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, async (sb, ctx) => (await import("@/lib/cron/jobs/crm-whatsapp.server")).runCrmWhatsAppBackstop(sb, ctx)),
    },
  },
});
