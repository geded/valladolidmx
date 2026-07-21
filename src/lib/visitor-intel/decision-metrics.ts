/** CV8.9.4 · Pure, recomputable workflow observability. */
import type { DecisionQueueProjection, ProjectedDecision } from "./decisions";

export interface DecisionRateMetric {
  numerator: number;
  denominator: number;
  value: number | null;
}

export interface DecisionWorkflowMetrics {
  acceptance_rate_7d: DecisionRateMetric;
  acceptance_rate_30d: DecisionRateMetric;
  time_to_accept_p50_hours: number | null;
  time_to_implement_p50_hours: number | null;
  validation_rate: DecisionRateMetric;
  bias_flag_rate: DecisionRateMetric;
  sla_breach_rate: DecisionRateMetric;
}

function rate(numerator: number, denominator: number): DecisionRateMetric {
  return {
    numerator,
    denominator,
    value: denominator === 0 ? null : Number((numerator / denominator).toFixed(4)),
  };
}

function appliedAt(decision: ProjectedDecision, state: string): string | undefined {
  return decision.history.find((entry) => entry.applied && entry.event.to_state === state)?.event
    .occurred_at;
}

function hoursBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const result =
    sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
  return Number(result.toFixed(2));
}

function acceptanceRate(
  decisions: readonly ProjectedDecision[],
  now: Date,
  windowDays: number,
): DecisionRateMetric {
  const since = now.getTime() - windowDays * 86_400_000;
  const cohort = decisions.filter((decision) => new Date(decision.proposed_at).getTime() >= since);
  return rate(
    cohort.filter((decision) => Boolean(appliedAt(decision, "accepted"))).length,
    cohort.length,
  );
}

export function projectDecisionWorkflowMetrics(
  projection: DecisionQueueProjection,
  options: { now: Date },
): DecisionWorkflowMetrics {
  const live = projection.decisions.filter((decision) => !decision.superseded_by_decision_id);
  const acceptHours: number[] = [];
  const implementHours: number[] = [];

  for (const decision of live) {
    const accepted = appliedAt(decision, "accepted");
    const implemented = appliedAt(decision, "implemented");
    if (accepted) acceptHours.push(hoursBetween(decision.proposed_at, accepted));
    if (accepted && implemented) implementHours.push(hoursBetween(accepted, implemented));
  }

  const implemented = live.filter((decision) => Boolean(appliedAt(decision, "implemented")));
  const dismissed = live.filter((decision) => decision.current_state === "dismissed");
  const biasDismissals = dismissed.filter((decision) =>
    /sesgo|explicaci[oó]n alternativa/i.test(decision.reason ?? ""),
  );
  const active = live.filter(
    (decision) => !["validated", "rejected", "dismissed"].includes(decision.current_state),
  );
  const overdue = new Set(
    projection.sla_flags
      .filter((entry) => ["overdue_due_at", "validation_window_expired"].includes(entry.flag))
      .map((entry) => entry.decision_id),
  );

  return {
    acceptance_rate_7d: acceptanceRate(live, options.now, 7),
    acceptance_rate_30d: acceptanceRate(live, options.now, 30),
    time_to_accept_p50_hours: median(acceptHours),
    time_to_implement_p50_hours: median(implementHours),
    validation_rate: rate(
      implemented.filter((decision) => decision.current_state === "validated").length,
      implemented.length,
    ),
    bias_flag_rate: rate(biasDismissals.length, dismissed.length),
    sla_breach_rate: rate(
      active.filter((decision) => overdue.has(decision.decision_id)).length,
      active.length,
    ),
  };
}
