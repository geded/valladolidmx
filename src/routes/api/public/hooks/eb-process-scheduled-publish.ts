import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

/**
 * US-D · Endpoint invocado por pg_cron para publicar automáticamente las
 * páginas cuya `scheduled_publish_at` ya llegó. Autenticación por secreto
 * server-only `EB_CRON_SECRET` (header `x-cron-secret` o
 * `Authorization: Bearer <secret>`), comparado en tiempo constante.
 * El prefijo /api/public/* omite la auth del sitio publicado, así que el
 * secreto ES la única barrera antes de la RPC SECURITY DEFINER
 * `eb_process_scheduled_publishes`.
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/public/hooks/eb-process-scheduled-publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        const expected = process.env.EB_CRON_SECRET ?? "";
        if (!expected || !provided || !safeEqual(provided, expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data, error } = await supabase.rpc("eb_process_scheduled_publishes");
        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return Response.json({
          ok: true,
          processed: Array.isArray(data) ? data.length : 0,
          items: data ?? [],
        });
      },
    },
  },
});