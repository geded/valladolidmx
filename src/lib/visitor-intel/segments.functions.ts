/**
 * CV8.4 · Visitor Intelligence Segmentation — Server fn v1.0.
 *
 * Agrega `visitor_intel.events` (append-only) por una dimensión permitida y
 * devuelve `JourneySegmentSnapshot` v1.0.0. No persiste snapshots — cumple
 * Founder Journey State Principle. Respeta Founder Ethical Segmentation
 * Principle: umbral mínimo, agrupación "Otros", cero identidades individuales.
 *
 * Dimensiones soportadas contra contrato v1.0.0 vigente:
 *   - locale        → `subject.locale`
 *   - destination   → `context.destination_id`
 *   - capability    → prefijo de `context.surface` (ej. "workspace:trip" → "workspace")
 *
 * Dimensiones declaradas por la Directiva Founder aún NO cubiertas por el
 * contrato v1.0.0 (country, channel, device): devuelven `status: "contract_pending"`
 * con prerequisito explícito. Sin datos ficticios (Founder Experience First).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { VisitorEventSchema, type VisitorEvent } from "./events";
import {
  JOURNEY_TRANSITIONS,
  type JourneyTransitionId,
} from "./journey";

export const SEGMENT_SNAPSHOT_CONTRACT_VERSION = "1.0.0" as const;

/** Umbral mínimo de sujetos activos por segmento (protección re-identificación). */
export const MIN_SEGMENT_POPULATION = 25 as const;

export type SegmentDimension =
  | "locale"
  | "destination"
  | "capability"
  | "country"
  | "channel"
  | "device";

export interface SegmentBucket {
  key: string;
  label: string;
  active_subjects: number;
  progressed_subjects: number;
  jpr: number;
  jpr_delta_vs_baseline: number;
  intent_signals: number;
  transitions: Record<JourneyTransitionId, number>;
  /** true si población < MIN_SEGMENT_POPULATION (se muestra dentro de "Otros"). */
  suppressed: boolean;
}

export interface JourneySegmentSnapshot {
  dimension: SegmentDimension;
  window_days: 7 | 30 | 90;
  computed_at: string;
  status: "ok" | "contract_pending" | "empty";
  /** Cuando status = "contract_pending" describe el prerrequisito. */
  pending_reason?: string;
  baseline: { active_subjects: number; jpr: number };
  buckets: SegmentBucket[];
  /** Segmentos agregados por umbral (Founder Ethical Segmentation Principle). */
  others: SegmentBucket | null;
  min_population: typeof MIN_SEGMENT_POPULATION;
  contract_version: typeof SEGMENT_SNAPSHOT_CONTRACT_VERSION;
}

const InputSchema = z.object({
  dimension: z.enum([
    "locale",
    "destination",
    "capability",
    "country",
    "channel",
    "device",
  ]),
  window_days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

const CONTRACT_PENDING: Record<string, string> = {
  country:
    "El contrato de evento v1.0.0 aún no incluye país. Se activará cuando la ingesta CV8.1 registre `context.country` (evolución aditiva prevista).",
  channel:
    "El contrato v1.0.0 aún no distingue canal de adquisición. Se activará cuando la ingesta registre `context.channel` (referral/paid/organic/direct).",
  device:
    "El contrato v1.0.0 aún no captura dispositivo. Se activará cuando la ingesta registre `context.device` (mobile/tablet/desktop).",
};

function bucketKeyFor(dim: SegmentDimension, evt: VisitorEvent): string | null {
  if (dim === "locale") return evt.subject.locale ?? null;
  if (dim === "destination") return evt.context.destination_id ?? null;
  if (dim === "capability") {
    const s = evt.context.surface;
    if (!s) return null;
    // "workspace:trip" → "workspace"; "listing:hotels" → "listing"; else full
    const idx = s.indexOf(":");
    return idx > 0 ? s.slice(0, idx) : s;
  }
  return null;
}

export const aggregateJourneySegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }): Promise<JourneySegmentSnapshot> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });

    const now = new Date();
    const emptyTransitions = () =>
      Object.fromEntries(
        (Object.keys(JOURNEY_TRANSITIONS) as JourneyTransitionId[]).map((id) => [id, 0]),
      ) as Record<JourneyTransitionId, number>;

    // Dimensión aún no cubierta por el contrato vigente.
    if (data.dimension in CONTRACT_PENDING) {
      return {
        dimension: data.dimension,
        window_days: data.window_days,
        computed_at: now.toISOString(),
        status: "contract_pending",
        pending_reason: CONTRACT_PENDING[data.dimension],
        baseline: { active_subjects: 0, jpr: 0 },
        buckets: [],
        others: null,
        min_population: MIN_SEGMENT_POPULATION,
        contract_version: SEGMENT_SNAPSHOT_CONTRACT_VERSION,
      };
    }

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
      console.error("[visitor_intel.segments] read failed", error);
      throw new Response("Read failed", { status: 500 });
    }

    // Baseline global + por bucket.
    const globalActive = new Set<string>();
    const globalProgressed = new Set<string>();
    const perBucket = new Map<
      string,
      {
        active: Set<string>;
        progressed: Set<string>;
        transitions: Record<JourneyTransitionId, number>;
        intent: number;
      }
    >();

    for (const r of rows ?? []) {
      const parsed = VisitorEventSchema.safeParse(r.payload);
      if (!parsed.success) continue;
      const evt = parsed.data;
      globalActive.add(evt.subject.subject_id);

      const key = bucketKeyFor(data.dimension, evt);
      if (key) {
        let b = perBucket.get(key);
        if (!b) {
          b = {
            active: new Set<string>(),
            progressed: new Set<string>(),
            transitions: emptyTransitions(),
            intent: 0,
          };
          perBucket.set(key, b);
        }
        b.active.add(evt.subject.subject_id);

        if (evt.kind === "journey.transition") {
          const canon = JOURNEY_TRANSITIONS[evt.transition.id as JourneyTransitionId];
          if (canon) {
            globalProgressed.add(evt.subject.subject_id);
            b.progressed.add(evt.subject.subject_id);
            b.transitions[canon.id] = (b.transitions[canon.id] ?? 0) + 1;
          }
        } else if (evt.kind === "intent.signal") {
          b.intent += 1;
        }
      } else if (evt.kind === "journey.transition") {
        // Aunque no tenga bucket, cuenta para baseline global.
        const canon = JOURNEY_TRANSITIONS[evt.transition.id as JourneyTransitionId];
        if (canon) globalProgressed.add(evt.subject.subject_id);
      }
    }

    const baselineActive = globalActive.size;
    const baselineJpr =
      baselineActive === 0
        ? 0
        : Number((globalProgressed.size / baselineActive).toFixed(4));

    if (perBucket.size === 0) {
      return {
        dimension: data.dimension,
        window_days: data.window_days,
        computed_at: now.toISOString(),
        status: baselineActive === 0 ? "empty" : "ok",
        baseline: { active_subjects: baselineActive, jpr: baselineJpr },
        buckets: [],
        others: null,
        min_population: MIN_SEGMENT_POPULATION,
        contract_version: SEGMENT_SNAPSHOT_CONTRACT_VERSION,
      };
    }

    const buckets: SegmentBucket[] = [];
    // Acumulador "Otros" (Founder Ethical Segmentation Principle).
    let othersActive = new Set<string>();
    let othersProgressed = new Set<string>();
    let othersIntent = 0;
    const othersTransitions = emptyTransitions();
    let othersCount = 0;

    for (const [key, b] of perBucket) {
      const active = b.active.size;
      const progressed = b.progressed.size;
      const jpr = active === 0 ? 0 : Number((progressed / active).toFixed(4));
      const suppressed = active < MIN_SEGMENT_POPULATION;

      if (suppressed) {
        othersCount += 1;
        for (const id of b.active) othersActive.add(id);
        for (const id of b.progressed) othersProgressed.add(id);
        othersIntent += b.intent;
        for (const t of Object.keys(b.transitions) as JourneyTransitionId[]) {
          othersTransitions[t] += b.transitions[t];
        }
        continue;
      }

      buckets.push({
        key,
        label: key,
        active_subjects: active,
        progressed_subjects: progressed,
        jpr,
        jpr_delta_vs_baseline: Number((jpr - baselineJpr).toFixed(4)),
        intent_signals: b.intent,
        transitions: b.transitions,
        suppressed: false,
      });
    }

    buckets.sort((a, b) => b.active_subjects - a.active_subjects);

    const others: SegmentBucket | null =
      othersCount === 0
        ? null
        : {
            key: "__others__",
            label: `Otros (${othersCount} segmentos < ${MIN_SEGMENT_POPULATION})`,
            active_subjects: othersActive.size,
            progressed_subjects: othersProgressed.size,
            jpr:
              othersActive.size === 0
                ? 0
                : Number((othersProgressed.size / othersActive.size).toFixed(4)),
            jpr_delta_vs_baseline: 0,
            intent_signals: othersIntent,
            transitions: othersTransitions,
            suppressed: true,
          };

    return {
      dimension: data.dimension,
      window_days: data.window_days,
      computed_at: now.toISOString(),
      status: "ok",
      baseline: { active_subjects: baselineActive, jpr: baselineJpr },
      buckets,
      others,
      min_population: MIN_SEGMENT_POPULATION,
      contract_version: SEGMENT_SNAPSHOT_CONTRACT_VERSION,
    };
  });