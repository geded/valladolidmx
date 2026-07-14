/**
 * CV8.3 · Visitor Intelligence Center — Aggregation server fn v1.0.
 *
 * Lee append-only `visitor_intel.events` para una ventana temporal y
 * devuelve el DTO `JourneyIntelSnapshot` v1.0.0. No persiste snapshots
 * — cumple Founder Journey State Principle (recomputación total).
 *
 * Autorización: admin | super_admin. Consume contratos v1.0.0 congelados.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { VisitorEventSchema, type VisitorEvent } from "./events";
import {
  JOURNEY_TRANSITIONS,
  VISITOR_STAGES,
  type JourneyTransitionId,
  type VisitorStage,
} from "./journey";

export const INTEL_SNAPSHOT_CONTRACT_VERSION = "1.0.0" as const;

export interface TransitionAggregate {
  id: JourneyTransitionId;
  count: number;
  distinct_subjects: number;
}

export interface JourneyIntelSnapshot {
  window_days: 7 | 30 | 90;
  computed_at: string;
  active_subjects: number;
  progressed_subjects: number;
  /** Journey Progression Rate en la ventana (0..1). */
  jpr: number;
  transitions: TransitionAggregate[];
  stages_entered: Record<VisitorStage, number>;
  intent_signals_total: number;
  decisions_offered_total: number;
  decisions_accepted_total: number;
  outcomes_positive_total: number;
  contract_version: typeof INTEL_SNAPSHOT_CONTRACT_VERSION;
}

const InputSchema = z.object({
  window_days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

export const aggregateJourneyIntel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<JourneyIntelSnapshot> => {
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
              gte: (
                c: string,
                v: string,
              ) => Promise<{
                data: Array<{ subject_id: string; payload: unknown }> | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    )
      .schema("visitor_intel")
      .from("events")
      .select("subject_id, payload")
      .gte("occurred_at", since);

    if (error) {
      console.error("[visitor_intel.intel-aggregate] read failed", error);
      throw new Response("Read failed", { status: 500 });
    }

    const activeSubjects = new Set<string>();
    const progressedSubjects = new Set<string>();
    const stagesEntered: Record<VisitorStage, number> = {
      stranger: 0, anonymous: 0, identified: 0, explorer: 0, interested: 0,
      travel_plan: 0, concierge: 0, reservation: 0, traveler: 0, ambassador: 0,
    };
    const transitionCount: Record<string, { count: number; subjects: Set<string> }> = {};
    let intent = 0;
    let offered = 0;
    let accepted = 0;
    let positiveOutcomes = 0;

    for (const r of rows ?? []) {
      const parsed = VisitorEventSchema.safeParse(r.payload);
      if (!parsed.success) continue;
      const evt: VisitorEvent = parsed.data;
      activeSubjects.add(evt.subject.subject_id);

      if (evt.kind === "journey.transition") {
        const canonical = JOURNEY_TRANSITIONS[evt.transition.id as JourneyTransitionId];
        if (!canonical) continue;
        progressedSubjects.add(evt.subject.subject_id);
        stagesEntered[canonical.to] = (stagesEntered[canonical.to] ?? 0) + 1;
        const bucket = (transitionCount[canonical.id] ??= {
          count: 0,
          subjects: new Set<string>(),
        });
        bucket.count += 1;
        bucket.subjects.add(evt.subject.subject_id);
      } else if (evt.kind === "intent.signal") {
        intent += 1;
      } else if (evt.kind === "decision.offered") {
        offered += 1;
        if (evt.decision.accepted === true) accepted += 1;
      } else if (evt.kind === "outcome.observed") {
        if ((evt.outcome.traveler_value ?? 0) >= 0.7) positiveOutcomes += 1;
      }
    }

    const transitions: TransitionAggregate[] = (
      Object.keys(JOURNEY_TRANSITIONS) as JourneyTransitionId[]
    ).map((id) => ({
      id,
      count: transitionCount[id]?.count ?? 0,
      distinct_subjects: transitionCount[id]?.subjects.size ?? 0,
    }));

    const active = activeSubjects.size;
    const jpr = active === 0 ? 0 : Number((progressedSubjects.size / active).toFixed(4));

    // ensure every canonical stage key exists in the record (typed)
    for (const s of VISITOR_STAGES) if (stagesEntered[s] === undefined) stagesEntered[s] = 0;

    return {
      window_days: data.window_days,
      computed_at: new Date().toISOString(),
      active_subjects: active,
      progressed_subjects: progressedSubjects.size,
      jpr,
      transitions,
      stages_entered: stagesEntered,
      intent_signals_total: intent,
      decisions_offered_total: offered,
      decisions_accepted_total: accepted,
      outcomes_positive_total: positiveOutcomes,
      contract_version: INTEL_SNAPSHOT_CONTRACT_VERSION,
    };
  });