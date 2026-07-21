/**
 * CV8.9.1 · Action Queue & Decision Workflow — Pure Contract v1.0.0.
 *
 * Recompone una cola operativa desde eventos append-only. No hace IO, no
 * persiste snapshots y no ejecuta acciones sobre el ecosistema.
 */
import { z } from "zod";

import type { PrioritizedOpportunity } from "./prioritization";
import type { SegmentFinding } from "./segment-prioritization";
import { JOURNEY_TRANSITIONS, type JourneyTransitionId } from "./journey";
import { KPI_CATALOG } from "./kpis";

export const DECISION_CONTRACT_VERSION = "1.0.0" as const;

export const DECISION_STATES = [
  "proposed",
  "accepted",
  "in_progress",
  "implemented",
  "validated",
  "deferred",
  "dismissed",
  "blocked",
  "rejected",
] as const;
export type DecisionState = (typeof DECISION_STATES)[number];

export const DECISION_ACTOR_ROLES = ["founder", "admin", "concierge_lead", "editor"] as const;
export type DecisionActorRole = (typeof DECISION_ACTOR_ROLES)[number];

export const DECISION_SEGMENT_DIMENSIONS = ["locale", "destination", "capability"] as const;
export type DecisionSegmentDimension = (typeof DECISION_SEGMENT_DIMENSIONS)[number];

export const DECISION_OUTCOMES = ["validated", "rejected", "dismissed"] as const;
export type DecisionOutcome = (typeof DECISION_OUTCOMES)[number];

export const DECISION_QUEUE_BUCKETS = [
  "today",
  "this_week",
  "waiting_validation",
  "overdue",
  "superseded",
] as const;
export type DecisionQueueBucket = (typeof DECISION_QUEUE_BUCKETS)[number];

export const DECISION_SLA_FLAGS = [
  "no_owner",
  "no_kpi",
  "overdue_due_at",
  "validation_window_expired",
] as const;
export type DecisionSlaFlag = (typeof DECISION_SLA_FLAGS)[number];

/**
 * Grafo congelado v1.0.0. `deferred` y `blocked` son pausas reversibles;
 * validated/rejected/dismissed son terminales. Una corrección se expresa con
 * una nueva decisión y `supersedes_decision_id`.
 */
export const DECISION_ALLOWED_TRANSITIONS: Readonly<
  Record<DecisionState, readonly DecisionState[]>
> = {
  proposed: ["accepted", "deferred", "dismissed"],
  accepted: ["in_progress", "deferred", "dismissed"],
  in_progress: ["implemented", "blocked", "deferred"],
  implemented: ["validated", "rejected"],
  validated: [],
  deferred: ["accepted", "dismissed"],
  dismissed: [],
  blocked: ["in_progress", "deferred", "dismissed"],
  rejected: [],
} as const;

const JOURNEY_TRANSITION_IDS = new Set<string>([...Object.keys(JOURNEY_TRANSITIONS), "aggregate"]);
const KPI_IDS = new Set(KPI_CATALOG.map((kpi) => kpi.id));

const JourneyTransitionSchema = z
  .string()
  .refine(
    (value): value is JourneyTransitionId | "aggregate" => JOURNEY_TRANSITION_IDS.has(value),
    "La transición no pertenece al Journey canónico CV8.0.",
  );

const KpiIdSchema = z
  .string()
  .refine((value) => KPI_IDS.has(value), "El KPI no pertenece a KPI_CATALOG CV8.0.");

export const DecisionSourceSchema = z.object({
  origin: z.enum(["cv87_priority", "cv88_segment", "manual"]),
  opportunity_id: z.string().min(1).optional(),
  // CV8.5 conserva familias observadas aunque todavía no estén promovidas al
  // catálogo. El KPI acordado sí debe pertenecer a KPI_CATALOG.
  metric_id: z.string().min(1),
  transition: JourneyTransitionSchema,
  segment: z
    .object({
      dimension: z.enum(DECISION_SEGMENT_DIMENSIONS),
      value: z.string().min(1),
    })
    .optional(),
  priority_score: z.number().min(0).max(1).optional(),
  learned_confidence: z.number().min(0).max(1).optional(),
});
export type DecisionSource = z.infer<typeof DecisionSourceSchema>;

export const DecisionAgreementSchema = z.object({
  action: z.string().trim().min(1).max(2_000),
  rationale: z.string().trim().min(1).max(2_000),
  owner_user_id: z.string().min(1),
  expected_kpi_id: KpiIdSchema,
  expected_direction: z.enum(["up", "down"]),
  expected_delta_relative: z.number().min(0).max(1),
  evaluation_window_days: z.number().int().positive().max(3_650),
  due_at: z.string().datetime().optional(),
});
export type DecisionAgreement = z.infer<typeof DecisionAgreementSchema>;

export const DecisionEvidenceSchema = z
  .object({
    metric_id: KpiIdSchema,
    observed_delta_relative: z.number(),
    sample_size: z.number().int().nonnegative(),
    window_start: z.string().datetime(),
    window_end: z.string().datetime(),
  })
  .refine((evidence) => evidence.window_end >= evidence.window_start, {
    message: "window_end debe ser posterior o igual a window_start.",
  });
export type DecisionEvidence = z.infer<typeof DecisionEvidenceSchema>;

const DecisionEventPayloadBaseSchema = z.object({
  decision_id: z.string().uuid(),
  from_state: z.enum(DECISION_STATES).nullable(),
  to_state: z.enum(DECISION_STATES),
  source: DecisionSourceSchema.optional(),
  agreement: DecisionAgreementSchema.optional(),
  evidence: DecisionEvidenceSchema.optional(),
  reason: z.string().trim().min(1).max(2_000).optional(),
  supersedes_decision_id: z.string().uuid().optional(),
  actor_user_id: z.string().min(1),
  actor_role: z.enum(DECISION_ACTOR_ROLES),
  occurred_at: z.string().datetime(),
});

export const DecisionEventPayloadSchema = DecisionEventPayloadBaseSchema.superRefine(
  (event, ctx) => {
    if (event.to_state === "proposed") {
      if (event.from_state !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["from_state"],
          message: "proposed debe iniciar desde null.",
        });
      }
      if (!event.source) {
        ctx.addIssue({
          code: "custom",
          path: ["source"],
          message: "proposed requiere source.",
        });
      }
    } else {
      if (event.from_state === null) {
        ctx.addIssue({
          code: "custom",
          path: ["from_state"],
          message: "Sólo proposed puede iniciar desde null.",
        });
      } else if (!DECISION_ALLOWED_TRANSITIONS[event.from_state].includes(event.to_state)) {
        ctx.addIssue({
          code: "custom",
          path: ["to_state"],
          message: `Transición prohibida: ${event.from_state} → ${event.to_state}.`,
        });
      }
      if (event.source) {
        ctx.addIssue({
          code: "custom",
          path: ["source"],
          message: "source sólo puede declararse en proposed.",
        });
      }
    }

    if (event.to_state === "accepted" && !event.agreement) {
      ctx.addIssue({
        code: "custom",
        path: ["agreement"],
        message: "accepted requiere un acuerdo humano completo.",
      });
    }
    if (
      event.agreement &&
      !(["accepted", "in_progress", "implemented"] as DecisionState[]).includes(event.to_state)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["agreement"],
        message: "agreement sólo puede declararse en accepted, in_progress o implemented.",
      });
    }

    if ((event.to_state === "validated" || event.to_state === "rejected") && !event.evidence) {
      ctx.addIssue({
        code: "custom",
        path: ["evidence"],
        message: `${event.to_state} requiere evidencia observable.`,
      });
    }
    if (event.evidence && event.to_state !== "validated" && event.to_state !== "rejected") {
      ctx.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "evidence sólo puede declararse en validated o rejected.",
      });
    }

    if (
      (["deferred", "dismissed", "blocked", "rejected"] as DecisionState[]).includes(
        event.to_state,
      ) &&
      !event.reason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: `${event.to_state} requiere motivo humano.`,
      });
    }
    if (
      event.reason &&
      !(["deferred", "dismissed", "blocked", "rejected"] as DecisionState[]).includes(
        event.to_state,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "reason sólo puede declararse en deferred, dismissed, blocked o rejected.",
      });
    }

    if (event.supersedes_decision_id && event.to_state !== "proposed") {
      ctx.addIssue({
        code: "custom",
        path: ["supersedes_decision_id"],
        message: "supersedes_decision_id sólo puede declararse en proposed.",
      });
    }
    if (event.supersedes_decision_id === event.decision_id) {
      ctx.addIssue({
        code: "custom",
        path: ["supersedes_decision_id"],
        message: "Una decisión no puede reemplazarse a sí misma.",
      });
    }
  },
);
export type DecisionEventPayload = z.infer<typeof DecisionEventPayloadSchema>;

export interface DecisionProjectionIssue {
  decision_id?: string;
  event_index: number;
  code:
    | "invalid_payload"
    | "orphan_transition"
    | "state_mismatch"
    | "duplicate_proposal"
    | "unknown_superseded_decision";
  message: string;
}

export interface DecisionHistoryEntry {
  event: DecisionEventPayload;
  applied: boolean;
  issue?: DecisionProjectionIssue["code"];
}

export interface ProjectedDecision {
  decision_id: string;
  current_state: DecisionState;
  source: DecisionSource;
  agreement?: DecisionAgreement;
  evidence?: DecisionEvidence;
  reason?: string;
  proposed_at: string;
  last_updated_at: string;
  last_actor_user_id: string;
  last_actor_role: DecisionActorRole;
  supersedes_decision_id?: string;
  superseded_by_decision_id?: string;
  history: DecisionHistoryEntry[];
}

export interface DecisionSlaEntry {
  decision_id: string;
  flag: DecisionSlaFlag;
  since?: string;
}

export interface DecisionFeedbackToCv86 {
  decision_id: string;
  metric_id: string;
  outcome: DecisionOutcome;
  occurred_at: string;
}

export interface DecisionQueueProjection {
  contract_version: typeof DECISION_CONTRACT_VERSION;
  computed_at: string;
  decisions: ProjectedDecision[];
  queue_buckets: Record<DecisionQueueBucket, string[]>;
  sla_flags: DecisionSlaEntry[];
  feedback_to_cv86: DecisionFeedbackToCv86[];
  issues: DecisionProjectionIssue[];
}

/** Adaptador puro CV8.7 → CV8.9. No recalcula ni copia el ranking. */
export function decisionSourceFromPrioritizedOpportunity(
  prioritized: PrioritizedOpportunity,
): DecisionSource {
  return DecisionSourceSchema.parse({
    origin: "cv87_priority",
    opportunity_id: prioritized.opportunity.id,
    metric_id: prioritized.opportunity.metric_id,
    transition: prioritized.opportunity.transition,
    priority_score: prioritized.score,
    learned_confidence: prioritized.learned_confidence,
  });
}

export interface SegmentDecisionSourceOptions {
  /** ID/hash estable emitido por el consumidor; CV8.9 no crea otro snapshot. */
  opportunity_id: string;
  learned_confidence?: number;
}

/**
 * Adaptador puro CV8.8 → CV8.9. Sólo las tres dimensiones activas y éticamente
 * autorizadas por CV8.8 producen una semilla accionable.
 */
export function decisionSourceFromSegmentFinding(
  finding: SegmentFinding,
  options: SegmentDecisionSourceOptions,
): DecisionSource | null {
  if (
    !DECISION_SEGMENT_DIMENSIONS.includes(finding.dimension as DecisionSegmentDimension) ||
    finding.type === "insufficient_data"
  ) {
    return null;
  }
  return DecisionSourceSchema.parse({
    origin: "cv88_segment",
    opportunity_id: options.opportunity_id,
    metric_id: "JPR_30D",
    transition: "aggregate",
    segment: {
      dimension: finding.dimension,
      value: finding.segment_key,
    },
    priority_score: finding.score,
    learned_confidence: options.learned_confidence,
  });
}

function emptyBuckets(): Record<DecisionQueueBucket, string[]> {
  return {
    today: [],
    this_week: [],
    waiting_validation: [],
    overdue: [],
    superseded: [],
  };
}

function isActiveState(state: DecisionState): boolean {
  return !(["validated", "dismissed", "rejected"] as DecisionState[]).includes(state);
}

function addIssue(issues: DecisionProjectionIssue[], issue: DecisionProjectionIssue): void {
  issues.push(issue);
}

/**
 * Proyección pura y determinista. Acepta `unknown[]` para que un evento
 * inválido quede auditable en `issues` sin contaminar el estado derivado.
 */
export function projectDecisionQueue(
  events: readonly unknown[],
  options: { now: Date },
): DecisionQueueProjection {
  const issues: DecisionProjectionIssue[] = [];
  const parsedEvents: Array<{ event: DecisionEventPayload; event_index: number }> = [];

  events.forEach((raw, event_index) => {
    const parsed = DecisionEventPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      const decisionId =
        typeof raw === "object" && raw !== null && "decision_id" in raw
          ? String((raw as { decision_id?: unknown }).decision_id ?? "") || undefined
          : undefined;
      addIssue(issues, {
        decision_id: decisionId,
        event_index,
        code: "invalid_payload",
        message: parsed.error.issues.map((issue) => issue.message).join(" "),
      });
      return;
    }
    parsedEvents.push({ event: parsed.data, event_index });
  });

  parsedEvents.sort(
    (a, b) =>
      a.event.occurred_at.localeCompare(b.event.occurred_at) || a.event_index - b.event_index,
  );

  const records = new Map<string, ProjectedDecision>();
  const proposalEventIndexes = new Map<string, number>();

  for (const { event, event_index } of parsedEvents) {
    const existing = records.get(event.decision_id);

    if (event.to_state === "proposed") {
      if (existing) {
        addIssue(issues, {
          decision_id: event.decision_id,
          event_index,
          code: "duplicate_proposal",
          message: "La decisión ya tiene un evento proposed aplicado.",
        });
        existing.history.push({ event, applied: false, issue: "duplicate_proposal" });
        continue;
      }

      records.set(event.decision_id, {
        decision_id: event.decision_id,
        current_state: "proposed",
        source: event.source!,
        agreement: event.agreement,
        evidence: event.evidence,
        reason: event.reason,
        proposed_at: event.occurred_at,
        last_updated_at: event.occurred_at,
        last_actor_user_id: event.actor_user_id,
        last_actor_role: event.actor_role,
        supersedes_decision_id: event.supersedes_decision_id,
        history: [{ event, applied: true }],
      });
      proposalEventIndexes.set(event.decision_id, event_index);
      continue;
    }

    if (!existing) {
      addIssue(issues, {
        decision_id: event.decision_id,
        event_index,
        code: "orphan_transition",
        message: "La transición no tiene un proposed previo aplicable.",
      });
      continue;
    }

    if (event.from_state !== existing.current_state) {
      addIssue(issues, {
        decision_id: event.decision_id,
        event_index,
        code: "state_mismatch",
        message: `El evento declara ${event.from_state}, pero la proyección está en ${existing.current_state}.`,
      });
      existing.history.push({ event, applied: false, issue: "state_mismatch" });
      continue;
    }

    existing.current_state = event.to_state;
    if (event.agreement) existing.agreement = event.agreement;
    if (event.evidence) existing.evidence = event.evidence;
    existing.reason = event.reason;
    existing.last_updated_at = event.occurred_at;
    existing.last_actor_user_id = event.actor_user_id;
    existing.last_actor_role = event.actor_role;
    existing.history.push({ event, applied: true });
  }

  const decisions = Array.from(records.values()).sort(
    (a, b) =>
      a.proposed_at.localeCompare(b.proposed_at) || a.decision_id.localeCompare(b.decision_id),
  );
  const byId = new Map(decisions.map((decision) => [decision.decision_id, decision]));

  for (const decision of decisions) {
    const targetId = decision.supersedes_decision_id;
    if (!targetId) continue;
    const target = byId.get(targetId);
    if (!target) {
      addIssue(issues, {
        decision_id: decision.decision_id,
        event_index: proposalEventIndexes.get(decision.decision_id) ?? -1,
        code: "unknown_superseded_decision",
        message: `La decisión reemplazada ${targetId} no existe en la proyección.`,
      });
      continue;
    }
    target.superseded_by_decision_id = decision.decision_id;
  }

  const nowMs = options.now.getTime();
  const endTodayMs =
    Date.UTC(
      options.now.getUTCFullYear(),
      options.now.getUTCMonth(),
      options.now.getUTCDate() + 1,
    ) - 1;
  const endWeekMs = endTodayMs + 6 * 86_400_000;
  const queue_buckets = emptyBuckets();
  const sla_flags: DecisionSlaEntry[] = [];

  for (const decision of decisions) {
    const agreement = decision.agreement;
    // En proposed/deferred estas banderas explican qué falta para aceptar;
    // en estados posteriores detectan una inconsistencia operativa.
    const agreementRequired = isActiveState(decision.current_state);

    if (agreementRequired && !agreement?.owner_user_id) {
      sla_flags.push({ decision_id: decision.decision_id, flag: "no_owner" });
    }
    if (agreementRequired && !agreement?.expected_kpi_id) {
      sla_flags.push({ decision_id: decision.decision_id, flag: "no_kpi" });
    }

    const dueMs = agreement?.due_at ? new Date(agreement.due_at).getTime() : undefined;
    const tracksActionDueDate = (
      ["proposed", "accepted", "in_progress", "deferred", "blocked"] as DecisionState[]
    ).includes(decision.current_state);
    if (dueMs !== undefined && dueMs < nowMs && tracksActionDueDate) {
      sla_flags.push({
        decision_id: decision.decision_id,
        flag: "overdue_due_at",
        since: agreement!.due_at,
      });
    }

    if (decision.current_state === "implemented" && agreement) {
      const implementedAt = [...decision.history]
        .reverse()
        .find((entry) => entry.applied && entry.event.to_state === "implemented")
        ?.event.occurred_at;
      if (implementedAt) {
        const expiresMs =
          new Date(implementedAt).getTime() + agreement.evaluation_window_days * 86_400_000;
        if (expiresMs < nowMs) {
          sla_flags.push({
            decision_id: decision.decision_id,
            flag: "validation_window_expired",
            since: new Date(expiresMs).toISOString(),
          });
        }
      }
    }

    if (decision.superseded_by_decision_id) {
      queue_buckets.superseded.push(decision.decision_id);
      continue;
    }
    if (!isActiveState(decision.current_state)) continue;

    const isOverdue = sla_flags.some(
      (entry) =>
        entry.decision_id === decision.decision_id &&
        (entry.flag === "overdue_due_at" || entry.flag === "validation_window_expired"),
    );
    if (isOverdue) {
      queue_buckets.overdue.push(decision.decision_id);
    } else if (decision.current_state === "implemented") {
      queue_buckets.waiting_validation.push(decision.decision_id);
    } else if (
      decision.current_state === "proposed" ||
      (dueMs !== undefined && dueMs <= endTodayMs)
    ) {
      queue_buckets.today.push(decision.decision_id);
    } else if (dueMs === undefined || dueMs <= endWeekMs) {
      queue_buckets.this_week.push(decision.decision_id);
    }
  }

  const compareIds = (left: string, right: string): number => {
    const a = byId.get(left)!;
    const b = byId.get(right)!;
    const score = (b.source.priority_score ?? -1) - (a.source.priority_score ?? -1);
    if (score !== 0) return score;
    const dueA = a.agreement?.due_at ?? "9999";
    const dueB = b.agreement?.due_at ?? "9999";
    return (
      dueA.localeCompare(dueB) ||
      a.proposed_at.localeCompare(b.proposed_at) ||
      left.localeCompare(right)
    );
  };
  for (const bucket of DECISION_QUEUE_BUCKETS) {
    queue_buckets[bucket].sort(compareIds);
  }

  const feedback_to_cv86: DecisionFeedbackToCv86[] = decisions
    .filter((decision) =>
      (DECISION_OUTCOMES as readonly DecisionState[]).includes(decision.current_state),
    )
    .map((decision) => ({
      decision_id: decision.decision_id,
      metric_id: decision.agreement?.expected_kpi_id ?? decision.source.metric_id,
      outcome: decision.current_state as DecisionOutcome,
      occurred_at: decision.last_updated_at,
    }));

  issues.sort(
    (a, b) =>
      a.event_index - b.event_index || (a.decision_id ?? "").localeCompare(b.decision_id ?? ""),
  );

  return {
    contract_version: DECISION_CONTRACT_VERSION,
    computed_at: options.now.toISOString(),
    decisions,
    queue_buckets,
    sla_flags,
    feedback_to_cv86,
    issues,
  };
}
