/**
 * CV8.5 · Benchmarks & Opportunity Intelligence — Server fn v1.0.
 *
 * Recomputa dos ventanas comparables (actual vs periodo anterior) desde
 * `visitor_intel.events` y deriva `OpportunitySnapshot v1.0.0`: benchmarks
 * contextualizados + alertas clasificadas + oportunidades explicables.
 *
 * Reutiliza contratos oficiales CV8.0 y la tabla append-only CV8.1. Cero
 * modelos paralelos. Cero snapshots persistidos (Founder Journey State).
 * Cumple Founder Opportunity Intelligence Principle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { VisitorEventSchema, type VisitorEvent } from "./events";
import { readVisitorIntelEvents } from "./event-reads.server";
import { JOURNEY_TRANSITIONS, type JourneyTransitionId } from "./journey";
import { KPI_CATALOG } from "./kpis";
import { influencersLabel, metricAction, STAGE_LABEL, TRANSITION_LABEL } from "./plain-language";

export const OPPORTUNITY_SNAPSHOT_CONTRACT_VERSION = "1.0.0" as const;

/** Muestra mínima para pronunciarse (Founder Signal Quality Principle). */
export const MIN_SAMPLE_FOR_OPPORTUNITY = 30 as const;

/** Umbral de significancia relativa (10%) para promover hallazgo a alerta. */
const SIGNIFICANCE_THRESHOLD = 0.1;

export type OpportunitySeverity =
  | "opportunity" // upside claro; recomendación de amplificar
  | "attention" // caída moderada; revisar
  | "critical" // caída severa sostenida; intervención inmediata
  | "informative"; // sin acción operativa; sólo contexto

export type OpportunityStatus = "ok" | "insufficient_data";

export interface BenchmarkComparison {
  reference: "previous_period";
  current_value: number;
  reference_value: number;
  delta_absolute: number;
  delta_relative: number;
  sample_size: number;
  confidence: "low" | "medium" | "high";
}

export interface Opportunity {
  id: string;
  severity: OpportunitySeverity;
  transition: JourneyTransitionId | "aggregate";
  metric_id: string;
  segment: string;
  headline: string;
  what_happens: string;
  why_it_happens: string;
  impact: string;
  recommended_action: string;
  expected_kpi: string;
  evidence: BenchmarkComparison;
}

export interface OpportunitySnapshot {
  window_days: 7 | 30 | 90;
  computed_at: string;
  status: OpportunityStatus;
  reason?: string;
  baseline: {
    active_subjects_current: number;
    active_subjects_previous: number;
    jpr_current: number;
    jpr_previous: number;
  };
  opportunities: Opportunity[];
  min_sample: typeof MIN_SAMPLE_FOR_OPPORTUNITY;
  contract_version: typeof OPPORTUNITY_SNAPSHOT_CONTRACT_VERSION;
}

const InputSchema = z.object({
  window_days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

interface WindowAggregate {
  active_subjects: Set<string>;
  progressed_subjects: Set<string>;
  transition_subjects: Record<JourneyTransitionId, Set<string>>;
  transition_count: Record<JourneyTransitionId, number>;
}

function emptyAggregate(): WindowAggregate {
  const t = {} as Record<JourneyTransitionId, Set<string>>;
  const c = {} as Record<JourneyTransitionId, number>;
  for (const id of Object.keys(JOURNEY_TRANSITIONS) as JourneyTransitionId[]) {
    t[id] = new Set<string>();
    c[id] = 0;
  }
  return {
    active_subjects: new Set<string>(),
    progressed_subjects: new Set<string>(),
    transition_subjects: t,
    transition_count: c,
  };
}

function ingest(agg: WindowAggregate, evt: VisitorEvent): void {
  agg.active_subjects.add(evt.subject.subject_id);
  if (evt.kind === "journey.transition") {
    const canonical = JOURNEY_TRANSITIONS[evt.transition.id as JourneyTransitionId];
    if (!canonical) return;
    agg.progressed_subjects.add(evt.subject.subject_id);
    agg.transition_subjects[canonical.id].add(evt.subject.subject_id);
    agg.transition_count[canonical.id] += 1;
  }
}

function classify(deltaRel: number, sample: number): OpportunitySeverity {
  if (sample < MIN_SAMPLE_FOR_OPPORTUNITY) return "informative";
  if (deltaRel <= -0.25) return "critical";
  if (deltaRel <= -SIGNIFICANCE_THRESHOLD) return "attention";
  if (deltaRel >= SIGNIFICANCE_THRESHOLD) return "opportunity";
  return "informative";
}

function confidence(sample: number): BenchmarkComparison["confidence"] {
  if (sample >= 300) return "high";
  if (sample >= MIN_SAMPLE_FOR_OPPORTUNITY) return "medium";
  return "low";
}

export const detectJourneyOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<OpportunitySnapshot> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) throw new Response("Forbidden", { status: 403 });

    const now = Date.now();
    const windowMs = data.window_days * 86_400_000;
    const currentSince = new Date(now - windowMs).toISOString();
    const previousSince = new Date(now - 2 * windowMs).toISOString();

    const rows = await readVisitorIntelEvents({ since: previousSince }, "opportunities");

    const current = emptyAggregate();
    const previous = emptyAggregate();
    for (const r of rows ?? []) {
      const parsed = VisitorEventSchema.safeParse(r.payload);
      if (!parsed.success) continue;
      if (r.occurred_at >= currentSince) ingest(current, parsed.data);
      else ingest(previous, parsed.data);
    }

    const jprCurrent =
      current.active_subjects.size === 0
        ? 0
        : current.progressed_subjects.size / current.active_subjects.size;
    const jprPrevious =
      previous.active_subjects.size === 0
        ? 0
        : previous.progressed_subjects.size / previous.active_subjects.size;

    const opportunities: Opportunity[] = [];
    const kpiById = new Map(KPI_CATALOG.map((k) => [k.id, k]));

    // ── JPR global (North Star) ──────────────────────────────────────
    if (current.active_subjects.size >= MIN_SAMPLE_FOR_OPPORTUNITY) {
      const deltaRel = jprPrevious === 0 ? 0 : (jprCurrent - jprPrevious) / jprPrevious;
      const sev = classify(deltaRel, current.active_subjects.size);
      const kpi = kpiById.get("JPR_30D");
      opportunities.push({
        id: "jpr_global",
        severity: sev,
        transition: "aggregate",
        metric_id: "JPR_30D",
        segment: "global",
        headline: `Avance del recorrido: ${(jprCurrent * 100).toFixed(1)}% ahora vs ${(jprPrevious * 100).toFixed(1)}% el periodo anterior`,
        what_happens:
          sev === "opportunity"
            ? "Más visitantes que antes dieron al menos un paso en su recorrido."
            : sev === "critical" || sev === "attention"
              ? "Menos visitantes que antes dieron al menos un paso en su recorrido."
              : "La proporción de visitantes que avanza se mantiene casi igual.",
        why_it_happens:
          "Compara qué parte de los visitantes avanzó al menos un paso en este periodo contra el anterior.",
        impact:
          "Es el indicador principal: si sube o baja de forma sostenida, se nota en reservas y recomendaciones.",
        recommended_action: metricAction(
          "JPR_30D",
          kpi?.actionable_decision ?? "Revisar paso por paso cuál está frenando el avance.",
        ),
        expected_kpi:
          sev === "opportunity"
            ? "Mantener o superar este nivel en el siguiente periodo."
            : "Volver al nivel del periodo anterior en el siguiente periodo.",
        evidence: {
          reference: "previous_period",
          current_value: Number(jprCurrent.toFixed(4)),
          reference_value: Number(jprPrevious.toFixed(4)),
          delta_absolute: Number((jprCurrent - jprPrevious).toFixed(4)),
          delta_relative: Number(deltaRel.toFixed(4)),
          sample_size: current.active_subjects.size,
          confidence: confidence(current.active_subjects.size),
        },
      });
    }

    // ── Por transición canónica ──────────────────────────────────────
    for (const id of Object.keys(JOURNEY_TRANSITIONS) as JourneyTransitionId[]) {
      const curSubjects = current.transition_subjects[id].size;
      const prevSubjects = previous.transition_subjects[id].size;
      const sample = curSubjects + prevSubjects;
      if (sample < MIN_SAMPLE_FOR_OPPORTUNITY) continue;

      const deltaAbs = curSubjects - prevSubjects;
      const deltaRel = prevSubjects === 0 ? (curSubjects > 0 ? 1 : 0) : deltaAbs / prevSubjects;
      const sev = classify(deltaRel, sample);
      if (sev === "informative") continue;

      const canonical = JOURNEY_TRANSITIONS[id];
      const kpiId = id.replace(/^(T\d)_.*/, "$1_conversion");
      const kpi = kpiById.get(kpiId);

      opportunities.push({
        id: `transition_${id}`,
        severity: sev,
        transition: id,
        metric_id: kpiId,
        segment: "global",
        headline: `Paso ${id.slice(1, 2)} · ${TRANSITION_LABEL[id]}: ${curSubjects} personas ahora vs ${prevSubjects} antes`,
        what_happens:
          sev === "opportunity"
            ? `Este paso creció ${(deltaRel * 100).toFixed(0)}% frente al periodo anterior.`
            : `Este paso bajó ${(Math.abs(deltaRel) * 100).toFixed(0)}% frente al periodo anterior.`,
        why_it_happens: `Cuenta a las personas que pasaron de «${STAGE_LABEL[canonical.from]}» a «${STAGE_LABEL[canonical.to]}». Influyen: ${influencersLabel(canonical.known_influencers)}.`,
        impact:
          sev === "critical"
            ? "Frena a todos los pasos siguientes: menos reservas y recomendaciones."
            : sev === "attention"
              ? "Si no se atiende, la baja se pasa a los pasos siguientes."
              : "Llegan más personas a los siguientes pasos; conviene aprovecharlo.",
        recommended_action: metricAction(
          kpiId,
          kpi?.actionable_decision ??
            `Revisar lo que influye en este paso (${influencersLabel(canonical.known_influencers)}).`,
        ),
        expected_kpi:
          sev === "opportunity"
            ? `Mantener al menos ${curSubjects} personas en este paso el siguiente periodo.`
            : `Volver a ${prevSubjects} personas en este paso el siguiente periodo.`,
        evidence: {
          reference: "previous_period",
          current_value: curSubjects,
          reference_value: prevSubjects,
          delta_absolute: deltaAbs,
          delta_relative: Number(deltaRel.toFixed(4)),
          sample_size: sample,
          confidence: confidence(sample),
        },
      });
    }

    const rankOrder: Record<OpportunitySeverity, number> = {
      critical: 0,
      attention: 1,
      opportunity: 2,
      informative: 3,
    };
    opportunities.sort((a, b) => {
      const s = rankOrder[a.severity] - rankOrder[b.severity];
      if (s !== 0) return s;
      return Math.abs(b.evidence.delta_relative) - Math.abs(a.evidence.delta_relative);
    });

    const status: OpportunityStatus =
      current.active_subjects.size < MIN_SAMPLE_FOR_OPPORTUNITY ? "insufficient_data" : "ok";

    return {
      window_days: data.window_days,
      computed_at: new Date().toISOString(),
      status,
      reason:
        status === "insufficient_data"
          ? `Todavía hay pocos datos: se necesitan al menos ${MIN_SAMPLE_FOR_OPPORTUNITY} visitantes en el periodo.`
          : undefined,
      baseline: {
        active_subjects_current: current.active_subjects.size,
        active_subjects_previous: previous.active_subjects.size,
        jpr_current: Number(jprCurrent.toFixed(4)),
        jpr_previous: Number(jprPrevious.toFixed(4)),
      },
      opportunities,
      min_sample: MIN_SAMPLE_FOR_OPPORTUNITY,
      contract_version: OPPORTUNITY_SNAPSHOT_CONTRACT_VERSION,
    };
  });
