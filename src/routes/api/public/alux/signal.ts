/**
 * Ola A11 · Señales de acción → memoria M3 (concierge, no chatbot).
 *
 * Endpoint público que registra ACCIONES del visitante (guardar cupón,
 * pedir cómo llegar, abrir una ficha, descartar una sugerencia, ver
 * promoción). Cada acción es una SEÑAL DE VIAJE que Alux debe recordar
 * sin necesidad de preguntar en el siguiente turno.
 *
 * No llama al modelo — es fire-and-forget y sólo actualiza:
 *   - alux_public_sessions.last_signals (dedupe)
 *   - alux_public_sessions.summary (append de una línea compacta)
 *   - alux_public_sessions.summary_updated_at
 */
import { createFileRoute } from "@tanstack/react-router";

const MAX_SUMMARY = 900;
const MAX_LABEL = 120;

type Action =
  | "view_business"
  | "request_directions"
  | "save_coupon"
  | "view_promotion"
  | "dismiss_suggestion"
  | "save_favorite"
  | "start_review"
  | "plan_updated";

const ACTION_VERB: Record<Action, string> = {
  view_business: "abrió la ficha de",
  request_directions: "pidió cómo llegar a",
  save_coupon: "guardó un cupón de",
  view_promotion: "vio la promoción de",
  dismiss_suggestion: "descartó",
  save_favorite: "marcó como favorito",
  start_review: "empezó a reseñar",
  plan_updated: "actualizó su plan de viaje:",
};

const ALLOWED = new Set<Action>(Object.keys(ACTION_VERB) as Action[]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/alux/signal")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        let body: {
          sessionKey?: string;
          action?: string;
          label?: string;
          slug?: string;
          pathContext?: { destination?: string | null; category?: string | null };
        };
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const sessionKey = String(body.sessionKey ?? "").slice(0, 128);
        const action = String(body.action ?? "") as Action;
        if (!sessionKey || sessionKey.length < 8) return json({ error: "missing_session" }, 400);
        if (!ALLOWED.has(action)) return json({ error: "unknown_action" }, 400);

        const label = (body.label ?? "").toString().trim().slice(0, MAX_LABEL);
        const slug = (body.slug ?? "").toString().trim().slice(0, 120) || null;
        const dest =
          typeof body.pathContext?.destination === "string"
            ? body.pathContext.destination.slice(0, 80)
            : null;
        const cat =
          typeof body.pathContext?.category === "string"
            ? body.pathContext.category.slice(0, 80)
            : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Localiza sesión (no crea — la sesión nace en el primer turno de chat).
        const { data: row, error } = await supabaseAdmin
          .from("alux_public_sessions")
          .select(
            "id, summary, last_signals, last_destination_slug, last_category_slug, visited_destinations, visited_categories, destination_visit_count",
          )
          .eq("session_key", sessionKey)
          .maybeSingle();
        if (error) return json({ error: "session_lookup_failed" }, 500);
        if (!row) return json({ ok: true, skipped: "no_session" });

        const prevSignals = Array.isArray(row.last_signals) ? (row.last_signals as string[]) : [];
        const signalKey = `act:${action}${slug ? `:${slug}` : ""}`;
        const mergedSignals = Array.from(new Set([...prevSignals, signalKey])).slice(-40);

        // Append determinista al summary (sin LLM). Deduplicamos línea completa.
        const verb = ACTION_VERB[action];
        const subject = label || slug || "una recomendación";
        const line = `· El visitante ${verb} ${subject}.`;
        const prevSummary = (row.summary as string | null) ?? "";
        const alreadyIn = prevSummary.includes(line);
        const nextSummary = alreadyIn
          ? prevSummary
          : (prevSummary ? prevSummary + "\n" + line : line).slice(-MAX_SUMMARY);

        const patch: {
          last_signals: string[];
          summary: string;
          summary_updated_at: string;
          last_seen_at: string;
          last_destination_slug?: string;
          last_category_slug?: string;
          visited_destinations?: Array<Record<string, unknown>>;
          visited_categories?: Array<Record<string, unknown>>;
          destination_visit_count?: number;
        } = {
          last_signals: mergedSignals,
          summary: nextSummary,
          summary_updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        };
        if (dest) patch.last_destination_slug = dest;
        if (cat) patch.last_category_slug = cat;

        // A16 · Memoria territorial persistente — acumular destinos y
        // categorías visitadas entre sesiones/turnos, dedupe por slug.
        const nowIso = new Date().toISOString();
        type Visit = { slug: string; label?: string | null; first_seen: string; last_seen: string; count: number };
        if (dest) {
          const arr: Visit[] = Array.isArray(row.visited_destinations)
            ? (row.visited_destinations as Visit[])
            : [];
          const idx = arr.findIndex((v) => v && v.slug === dest);
          const changedDest = idx === -1 || arr[idx].slug !== (row.last_destination_slug ?? null);
          if (idx === -1) {
            arr.push({ slug: dest, label: dest, first_seen: nowIso, last_seen: nowIso, count: 1 });
          } else {
            arr[idx].last_seen = nowIso;
            if (changedDest) arr[idx].count = (arr[idx].count ?? 0) + 1;
          }
          patch.visited_destinations = arr.slice(-20);
          if (changedDest) {
            patch.destination_visit_count =
              (row.destination_visit_count as number | null | undefined) ?? 0;
            patch.destination_visit_count = (patch.destination_visit_count ?? 0) + 1;
          }
        }
        if (cat) {
          type CatVisit = { slug: string; count: number; last_seen: string };
          const arr: CatVisit[] = Array.isArray(row.visited_categories)
            ? (row.visited_categories as CatVisit[])
            : [];
          const idx = arr.findIndex((v) => v && v.slug === cat);
          if (idx === -1) arr.push({ slug: cat, count: 1, last_seen: nowIso });
          else {
            arr[idx].last_seen = nowIso;
            arr[idx].count = (arr[idx].count ?? 0) + 1;
          }
          patch.visited_categories = arr.slice(-30);
        }

        await (supabaseAdmin as unknown as {
          from: (t: string) => {
            update: (v: Record<string, unknown>) => {
              eq: (c: string, v: unknown) => Promise<{ error: unknown }>;
            };
          };
        })
          .from("alux_public_sessions")
          .update(patch)
          .eq("id", row.id);

        return json({
          ok: true,
          signal: signalKey,
          summary_appended: !alreadyIn,
        });
      },
    },
  },
});