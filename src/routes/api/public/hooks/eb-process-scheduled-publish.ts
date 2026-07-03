import { createFileRoute } from "@tanstack/react-router";

/**
 * US-D · Endpoint invocado por pg_cron para publicar automáticamente las
 * páginas cuya `scheduled_publish_at` ya llegó. Autenticación por apikey
 * (anon) — el prefijo /api/public/* omite la auth del sitio publicado, y
 * el trabajo real lo hace la RPC SECURITY DEFINER `eb_process_scheduled_publishes`,
 * que sólo está accesible desde el servidor.
 */
export const Route = createFileRoute("/api/public/hooks/eb-process-scheduled-publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          "";
        if (!expected || apikey !== expected) {
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