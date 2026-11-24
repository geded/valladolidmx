import { createFileRoute } from "@tanstack/react-router";
import { handleCronHook } from "@/lib/cron/cron-hook-auth.server";

/**
 * Ronda de cada minuto del agente de WhatsApp del administrador: lee sus
 * preguntas, las contesta y le avisa de nuevas conversaciones con Alux.
 * Autenticación: sólo la cabecera privada `x-cron-secret` (fail closed).
 */
export const Route = createFileRoute("/api/public/hooks/whatsapp-agent")({
  server: {
    handlers: {
      POST: ({ request }) => handleCronHook(request, async (sb, ctx) => (await import("@/lib/cron/jobs/whatsapp-agent.server")).runWhatsAppAgentTick(sb, ctx)),
    },
  },
});
