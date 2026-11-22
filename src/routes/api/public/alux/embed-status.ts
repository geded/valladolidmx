/**
 * CRM · Fase 4 — ¿Puede mostrarse Alux en este sitio?
 * Lo consulta `public/alux-embed.js` desde páginas de aliados. Solo
 * responde un booleano: canal «Alux en otras páginas» encendido y sitio
 * en la lista autorizada. Sin datos personales ni configuración.
 */
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

function reply(enabled: boolean): Response {
  return new Response(JSON.stringify({ enabled }), {
    status: 200,
    headers: { ...CORS, "content-type": "application/json", "cache-control": "public, max-age=60" },
  });
}

export const Route = createFileRoute("/api/public/alux/embed-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const [{ supabaseAdmin }, server, rules] = await Promise.all([
          import("@/integrations/supabase/client.server"),
          import("@/lib/alux/channels.server"),
          import("@/lib/alux/channels"),
        ]);
        const host = rules.normalizeEmbedHost(url.searchParams.get("host") ?? "");
        if (!host) return reply(false);
        try {
          const flags = await server.readAluxSettingsFlagsServer(supabaseAdmin);
          if (!rules.channelsFromFlags(flags).embed) return reply(false);
          const hosts = server.embedHostsFromFlags(flags);
          return reply(hosts.some((h) => host === h || host.endsWith(`.${h}`)));
        } catch {
          return reply(false);
        }
      },
    },
  },
});
