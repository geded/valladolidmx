/**
 * CV8.6 · Recommendation Validation Loop — Server fns v1.0.
 *
 * Reutiliza `visitor_intel.events` (CV8.1) para trazar el ciclo de vida
 * completo de cada recomendación emitida por Visitor Intelligence:
 *   detected → accepted → implemented → observed → validated | discarded.
 *
 * Cumple:
 *  - Founder Continuous Improvement Principle (CV8.6).
 *  - Founder Journey State Principle (estado recomputado, jamás persistido).
 *  - Founder Opportunity Intelligence Principle (evidencia explícita).
 *  - Founder Signal Quality Principle (n≥MIN_FAMILY_SIGNAL para aprender).
 *
 * Cero tablas nuevas. Cero snapshots. Cero modelos paralelos.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  RECOMMENDATION_LIFECYCLE_STATUSES,
  VisitorEventSchema,
  type RecommendationLifecycleEvent,
  type RecommendationLifecycleStatus,
} from "./events";

export const RECOMMENDATION_VALIDATION_CONTRACT_VERSION = "1.0.0" as const;

/** Muestra mínima para aprender confianza sobre una familia (metric_id). */
export const MIN_FAMILY_SIGNAL = 5 as const;

export interface RecommendationLifecycleStep {
  status: RecommendationLifecycleStatus;
  occurred_at: string;
  actor: string;
  note?: string;
  outcome?: RecommendationLifecycleEvent["recommendation"]["outcome"];
}

export interface RecommendationRecord {
  recommendation_id: string;
  metric_id: string;
  transition: string;
  severity: RecommendationLifecycleEvent["recommendation"]["severity"];
  current_status: RecommendationLifecycleStatus;
  first_seen_at: string;
  last_updated_at: string;
  timeline: RecommendationLifecycleStep[];
  latest_outcome?: RecommendationLifecycleEvent["recommendation"]["outcome"];
}

export interface FamilyLearningSignal {
  metric_id: string;
  sample_size: number;
  validated: number;
  discarded: number;
  /** Confianza aprendida ∈ [0,1] = validated / (validated + discarded). */
  learned_confidence: number;
  /** Estado explicable: null si muestra < MIN_FAMILY_SIGNAL. */
  reliability: "insufficient_data" | "learning" | "reliable";
}

export interface RecommendationValidationSnapshot {
  window_days: 30 | 90 | 180;
  computed_at: string;
  totals: Record<RecommendationLifecycleStatus, number>;
  active: RecommendationRecord[];
  closed: RecommendationRecord[];
  family_confidence: FamilyLearningSignal[];
  min_family_signal: typeof MIN_FAMILY_SIGNAL;
  contract_version: typeof RECOMMENDATION_VALIDATION_CONTRACT_VERSION;
}

const InputSchema = z.object({
  window_days: z
    .union([z.literal(30), z.literal(90), z.literal(180)])
    .default(90),
});

function rankStatus(s: RecommendationLifecycleStatus): number {
  return RECOMMENDATION_LIFECYCLE_STATUSES.indexOf(s);
}

/**
 * Escribe una transición de ciclo de vida — admin/super_admin.
 * El evento se persiste vía CV8.1 append-only; el estado se recomputa siempre.
 */
export const recordRecommendationLifecycleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { event: unknown }) => ({
    event: VisitorEventSchema.parse(data.event),
  }))
  .handler(async ({ data, context }) => {
    if (data.event.kind !== "recommendation.lifecycle") {
      throw new Response("Wrong event kind", { status: 400 });
    }
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      event_id: data.event.event_id,
      occurred_at: data.event.occurred_at,
      schema_version: data.event.schema_version,
      kind: data.event.kind,
      subject_id: data.event.subject.subject_id,
      trust_level: data.event.subject.trust_level,
      is_authenticated: data.event.subject.is_authenticated,
      locale: data.event.subject.locale ?? null,
      destination_id: data.event.context.destination_id ?? null,
      surface: data.event.context.surface,
      route: data.event.context.route,
      travel_stage: data.event.context.travel_stage ?? null,
      live_day_phase: data.event.context.live_day_phase ?? null,
      payload: data.event,
      retention_bucket: "R_24M",
    };
    const { error } = await (
      supabaseAdmin as unknown as {
        schema: (s: string) => {
          from: (t: string) => {
            upsert: (
              r: Record<string, unknown>,
              o: { onConflict: string; ignoreDuplicates: boolean },
            ) => Promise<{ error: { code?: string; message: string } | null }>;
          };
        };
      }
    )
      .schema("visitor_intel")
      .from("events")
      .upsert(row, { onConflict: "event_id", ignoreDuplicates: true });
    if (error && error.code !== "23505") {
      console.error("[visitor_intel.recommendations] insert failed", error);
      throw new Response("Insert failed", { status: 500 });
    }
    return { accepted: true, event_id: data.event.event_id };
  });

/**
 * Recomputa el snapshot completo de validación desde el historial append-only.
 * Admin/super_admin. Sin persistencia adicional.
 */
export const aggregateRecommendationValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<RecommendationValidationSnapshot> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });

    const since = new Date(Date.now() - data.window_days * 86_400_000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await (
      supabaseAdmin as unknown as {
        schema: (s: string) => {
          from: (t: string) => {
            select: (c: string) => {
              eq: (
                c: string,
                v: string,
              ) => {
                gte: (
                  c: string,
                  v: string,
                ) => Promise<{
                  data: Array<{ occurred_at: string; payload: unknown }> | null;
                  error: unknown;
                }>;
              };
            };
          };
        };
      }
    )
      .schema("visitor_intel")
      .from("events")
      .select("occurred_at, payload")
      .eq("kind", "recommendation.lifecycle")
      .gte("occurred_at", since);

    if (error) {
      console.error("[visitor_intel.recommendations] read failed", error);
      throw new Response("Read failed", { status: 500 });
    }

    const records = new Map<string, RecommendationRecord>();
    for (const r of rows ?? []) {
      const parsed = VisitorEventSchema.safeParse(r.payload);
      if (!parsed.success || parsed.data.kind !== "recommendation.lifecycle") continue;
      const evt = parsed.data;
      const rec = evt.recommendation;
      const existing = records.get(rec.recommendation_id);
      const step: RecommendationLifecycleStep = {
        status: rec.status,
        occurred_at: evt.occurred_at,
        actor: rec.actor,
        note: rec.note,
        outcome: rec.outcome,
      };
      if (!existing) {
        records.set(rec.recommendation_id, {
          recommendation_id: rec.recommendation_id,
          metric_id: rec.metric_id,
          transition: rec.transition,
          severity: rec.severity,
          current_status: rec.status,
          first_seen_at: evt.occurred_at,
          last_updated_at: evt.occurred_at,
          timeline: [step],
          latest_outcome: rec.outcome,
        });
        continue;
      }
      existing.timeline.push(step);
      if (evt.occurred_at < existing.first_seen_at) existing.first_seen_at = evt.occurred_at;
      if (evt.occurred_at >= existing.last_updated_at) {
        existing.last_updated_at = evt.occurred_at;
        existing.current_status = rec.status;
        if (rec.outcome) existing.latest_outcome = rec.outcome;
      }
    }

    // Ordenar timelines por tiempo real (append-only puede llegar fuera de orden).
    for (const rec of records.values()) {
      rec.timeline.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
      // recompute current_status from last chronological step
      const last = rec.timeline[rec.timeline.length - 1];
      rec.current_status = last.status;
    }

    const totals = Object.fromEntries(
      RECOMMENDATION_LIFECYCLE_STATUSES.map((s) => [s, 0]),
    ) as Record<RecommendationLifecycleStatus, number>;
    const active: RecommendationRecord[] = [];
    const closed: RecommendationRecord[] = [];
    const family = new Map<string, { validated: number; discarded: number }>();

    for (const rec of records.values()) {
      totals[rec.current_status] += 1;
      if (rec.current_status === "validated" || rec.current_status === "discarded") {
        closed.push(rec);
        const f = family.get(rec.metric_id) ?? { validated: 0, discarded: 0 };
        if (rec.current_status === "validated") f.validated += 1;
        else f.discarded += 1;
        family.set(rec.metric_id, f);
      } else {
        active.push(rec);
      }
    }

    const sortByRecent = (a: RecommendationRecord, b: RecommendationRecord) =>
      b.last_updated_at.localeCompare(a.last_updated_at);
    active.sort((a, b) => rankStatus(b.current_status) - rankStatus(a.current_status) || sortByRecent(a, b));
    closed.sort(sortByRecent);

    const family_confidence: FamilyLearningSignal[] = Array.from(family.entries())
      .map(([metric_id, f]) => {
        const sample = f.validated + f.discarded;
        const conf = sample === 0 ? 0 : f.validated / sample;
        const reliability: FamilyLearningSignal["reliability"] =
          sample < MIN_FAMILY_SIGNAL
            ? "insufficient_data"
            : sample < MIN_FAMILY_SIGNAL * 3
              ? "learning"
              : "reliable";
        return {
          metric_id,
          sample_size: sample,
          validated: f.validated,
          discarded: f.discarded,
          learned_confidence: Number(conf.toFixed(4)),
          reliability,
        };
      })
      .sort((a, b) => b.sample_size - a.sample_size);

    return {
      window_days: data.window_days,
      computed_at: new Date().toISOString(),
      totals,
      active,
      closed,
      family_confidence,
      min_family_signal: MIN_FAMILY_SIGNAL,
      contract_version: RECOMMENDATION_VALIDATION_CONTRACT_VERSION,
    };
  });