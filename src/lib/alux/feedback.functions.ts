/**
 * Ola A4 · Alux Feedback Loop
 *
 * Contrato:
 *  - submitAluxFeedback: viajero escribe su propio 👍/👎 sobre una respuesta.
 *  - listMyRecentAluxFeedback: memoria episódica ligera (M3) — últimos N
 *    feedback del propio usuario para inyectar como contexto en el próximo turno.
 *  - getAluxFeedbackStats: admin-only — KPIs agregados (CSAT global, por
 *    capacidad, por día, top knowledge_ids citados en respuestas con 👎).
 *
 * RLS ya cubre la separación viajero/admin. Los helpers aquí sólo
 * proyectan las columnas seguras y limitan el volumen.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CAPABILITIES = [
  "suggest_experiences",
  "suggest_restaurants",
  "suggest_hotels",
  "improve_trip",
  "detect_gaps",
  "draft_concierge_message",
  "suggest_from_coupons",
  "discover_promotions",
] as const;

const SubmitInput = z.object({
  capability: z.enum(CAPABILITIES),
  rating: z.union([z.literal(1), z.literal(-1)]),
  reason: z.string().trim().max(500).optional(),
  suggestionText: z.string().max(4000).optional(),
  knowledgeIds: z.array(z.string().uuid()).max(20).optional().default([]),
  model: z.string().max(120).optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

type SbLike = {
  from: (t: string) => any;
  rpc?: (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/**
 * submitAluxFeedback — viajero califica una respuesta de Alux.
 */
export const submitAluxFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbLike;
    const excerpt = data.suggestionText
      ? data.suggestionText.slice(0, 280)
      : null;
    const hash = data.suggestionText ? hashText(data.suggestionText) : null;

    const { data: row, error } = await sb
      .from("alux_feedback")
      .insert({
        user_id: context.userId,
        capability: data.capability,
        rating: data.rating,
        reason: data.reason ?? null,
        suggestion_excerpt: excerpt,
        suggestion_hash: hash,
        knowledge_ids: data.knowledgeIds ?? [],
        model: data.model ?? null,
        latency_ms: data.latencyMs ?? null,
        meta: data.meta ?? {},
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id, ok: true as const };
  });

/**
 * listMyRecentAluxFeedback — usado por Alux para inyectar M3 (aprendizaje
 * de preferencias del viajero) en el siguiente turno.
 */
export const listMyRecentAluxFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).optional().default(10) })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbLike;
    const { data: rows, error } = await sb
      .from("alux_feedback")
      .select("id, capability, rating, reason, suggestion_excerpt, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      capability: string;
      rating: number;
      reason: string | null;
      suggestion_excerpt: string | null;
      created_at: string;
    }>;
  });

export interface AluxFeedbackStats {
  totals: { up: number; down: number; total: number; csat: number };
  perCapability: Array<{
    capability: string;
    up: number;
    down: number;
    total: number;
    csat: number;
  }>;
  perDay: Array<{ day: string; up: number; down: number }>;
  recent: Array<{
    id: string;
    capability: string;
    rating: number;
    reason: string | null;
    suggestion_excerpt: string | null;
    created_at: string;
  }>;
  knowledgeDownHits: Array<{ knowledge_id: string; hits: number }>;
}

/**
 * getAluxFeedbackStats — admin-only. Autoriza dentro del handler para no
 * exponer datos si RLS falla. Devuelve agregados listos para render.
 */
export const getAluxFeedbackStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ days: z.number().int().min(1).max(90).optional().default(30) })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<AluxFeedbackStats> => {
    const sb = context.supabase as SbLike;

    // Doble verificación (defensa en profundidad).
    const roleChecks = await Promise.all([
      sb.rpc?.("has_role", { _user_id: context.userId, _role: "super_admin" }),
      sb.rpc?.("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    const isAdmin = roleChecks.some(
      (r) => (r as { data?: boolean } | undefined)?.data === true,
    );
    if (!isAdmin) throw new Error("Forbidden");

    const sinceIso = new Date(
      Date.now() - data.days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: rows, error } = await sb
      .from("alux_feedback")
      .select(
        "id, capability, rating, reason, suggestion_excerpt, knowledge_ids, created_at",
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    type Row = {
      id: string;
      capability: string;
      rating: number;
      reason: string | null;
      suggestion_excerpt: string | null;
      knowledge_ids: string[] | null;
      created_at: string;
    };
    const list = (rows ?? []) as Row[];

    let up = 0;
    let down = 0;
    const capMap = new Map<string, { up: number; down: number }>();
    const dayMap = new Map<string, { up: number; down: number }>();
    const kbDown = new Map<string, number>();

    for (const r of list) {
      if (r.rating === 1) up += 1;
      else if (r.rating === -1) down += 1;

      const c = capMap.get(r.capability) ?? { up: 0, down: 0 };
      if (r.rating === 1) c.up += 1;
      else if (r.rating === -1) c.down += 1;
      capMap.set(r.capability, c);

      const day = r.created_at.slice(0, 10);
      const d = dayMap.get(day) ?? { up: 0, down: 0 };
      if (r.rating === 1) d.up += 1;
      else if (r.rating === -1) d.down += 1;
      dayMap.set(day, d);

      if (r.rating === -1 && Array.isArray(r.knowledge_ids)) {
        for (const id of r.knowledge_ids) {
          kbDown.set(id, (kbDown.get(id) ?? 0) + 1);
        }
      }
    }

    const total = up + down;
    const csat = total > 0 ? up / total : 0;

    const perCapability = Array.from(capMap.entries())
      .map(([capability, v]) => {
        const t = v.up + v.down;
        return {
          capability,
          up: v.up,
          down: v.down,
          total: t,
          csat: t > 0 ? v.up / t : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const perDay = Array.from(dayMap.entries())
      .map(([day, v]) => ({ day, up: v.up, down: v.down }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const knowledgeDownHits = Array.from(kbDown.entries())
      .map(([knowledge_id, hits]) => ({ knowledge_id, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return {
      totals: { up, down, total, csat },
      perCapability,
      perDay,
      recent: list.slice(0, 30).map((r) => ({
        id: r.id,
        capability: r.capability,
        rating: r.rating,
        reason: r.reason,
        suggestion_excerpt: r.suggestion_excerpt,
        created_at: r.created_at,
      })),
      knowledgeDownHits,
    };
  });