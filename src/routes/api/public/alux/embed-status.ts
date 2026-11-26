/**
 * CRM · Fase 4 — ¿Puede mostrarse Alux en este sitio?
 * Devuelve una autorización firmada de 15 minutos para el host y las pistas
 * normalizadas. El marco debe presentarla; no basta con declarar un host.
 */
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

function reply(enabled: boolean, token: string | null = null): Response {
  return new Response(JSON.stringify({ enabled, token }), {
    status: 200,
    headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/alux/embed-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const [{ server, rules, tokens }, secret] = await Promise.all([
          Promise.all([
            import("@/lib/alux/channels.server"),
            import("@/lib/alux/channels"),
            import("@/lib/alux/embed-token.server"),
          ]).then(([server, rules, tokens]) => ({ server, rules, tokens })),
          Promise.resolve(process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? ""),
        ]);
        const host = rules.normalizeEmbedHost(url.searchParams.get("host") ?? "");
        if (!host || !secret) return reply(false);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const flags = await server.readAluxSettingsFlagsServer(supabaseAdmin);
          if (!rules.channelsFromFlags(flags).embed) return reply(false);
          const hosts = server.embedHostsFromFlags(flags);
          if (!hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
            return reply(false);
          }
          const token = tokens.issueAluxEmbedToken(
            {
              host,
              destino: url.searchParams.get("destino"),
              empresa: url.searchParams.get("empresa"),
            },
            secret,
          );
          return token ? reply(true, token) : reply(false);
        } catch {
          return reply(false);
        }
      },
    },
  },
});
