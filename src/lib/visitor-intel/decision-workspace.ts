/** CV8.9.3 · Pure presentation policy for the governed Decision Workspace. */
import {
  DECISION_ALLOWED_TRANSITIONS,
  type DecisionQueueBucket,
  type DecisionState,
  type ProjectedDecision,
} from "./decisions";
import { canTransitionDecision, type DecisionActorAccess } from "./decision-operations";

export const DECISION_BUCKET_LABELS: Readonly<Record<DecisionQueueBucket, string>> = {
  today: "Hoy",
  this_week: "Esta semana",
  waiting_validation: "Esperando validación",
  overdue: "Vencidas",
  superseded: "Reemplazadas",
};

export const DECISION_STATE_LABELS: Readonly<Record<DecisionState, string>> = {
  proposed: "Propuesta",
  accepted: "Aceptada",
  in_progress: "En progreso",
  implemented: "Implementada",
  validated: "Validada",
  deferred: "Pospuesta",
  dismissed: "Descartada",
  blocked: "Bloqueada",
  rejected: "Rechazada",
};

export const DECISION_ORIGIN_LABELS = {
  cv87_priority: "CV8.7 · Prioridad",
  cv88_segment: "CV8.8 · Segmento",
  manual: "Manual",
} as const;

/** Mirrors server authorization so unavailable controls are not advertised. */
export function availableDecisionTransitions(
  actor: DecisionActorAccess,
  decision: ProjectedDecision,
): DecisionState[] {
  if (decision.superseded_by_decision_id) return [];
  return DECISION_ALLOWED_TRANSITIONS[decision.current_state].filter((state) =>
    canTransitionDecision(actor, decision, state),
  );
}

export function decisionSearchText(decision: ProjectedDecision): string {
  return [
    decision.decision_id,
    decision.source.metric_id,
    decision.source.transition,
    decision.source.opportunity_id,
    decision.source.segment?.dimension,
    decision.source.segment?.value,
    decision.agreement?.action,
    decision.agreement?.rationale,
    decision.agreement?.owner_user_id,
    decision.reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es-MX");
}
