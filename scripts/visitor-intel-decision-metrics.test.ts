import { describe, expect, it } from "vitest";

import { projectDecisionWorkflowMetrics } from "@/lib/visitor-intel/decision-metrics";
import { projectDecisionQueue, type DecisionEventPayload } from "@/lib/visitor-intel/decisions";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER = "20000000-0000-4000-8000-000000000002";

function event(input: Partial<DecisionEventPayload> & Pick<DecisionEventPayload, "to_state">) {
  return {
    decision_id: A,
    from_state: null,
    actor_user_id: OWNER,
    actor_role: "founder",
    occurred_at: "2026-07-19T10:00:00.000Z",
    ...input,
  } as DecisionEventPayload;
}

describe("CV8.9.4 · workflow metrics", () => {
  it("derives rates and median times without persisting a snapshot", () => {
    const projection = projectDecisionQueue(
      [
        event({
          to_state: "proposed",
          source: { origin: "manual", metric_id: "JPR_30D", transition: "aggregate" },
        }),
        event({
          from_state: "proposed",
          to_state: "accepted",
          occurred_at: "2026-07-19T12:00:00.000Z",
          agreement: {
            action: "Reducir fricción",
            rationale: "Evidencia suficiente",
            owner_user_id: OWNER,
            expected_kpi_id: "JPR_30D",
            expected_direction: "up",
            expected_delta_relative: 0.1,
            evaluation_window_days: 7,
          },
        }),
        event({
          from_state: "accepted",
          to_state: "in_progress",
          occurred_at: "2026-07-19T13:00:00.000Z",
        }),
        event({
          from_state: "in_progress",
          to_state: "implemented",
          occurred_at: "2026-07-19T18:00:00.000Z",
        }),
        event({
          from_state: "implemented",
          to_state: "validated",
          occurred_at: "2026-07-20T10:00:00.000Z",
          evidence: {
            metric_id: "JPR_30D",
            observed_delta_relative: 0.11,
            sample_size: 100,
            window_start: "2026-07-13T00:00:00.000Z",
            window_end: "2026-07-20T00:00:00.000Z",
          },
        }),
      ],
      { now: new Date("2026-07-20T12:00:00.000Z") },
    );
    const metrics = projectDecisionWorkflowMetrics(projection, {
      now: new Date("2026-07-20T12:00:00.000Z"),
    });

    expect(metrics.acceptance_rate_7d.value).toBe(1);
    expect(metrics.time_to_accept_p50_hours).toBe(2);
    expect(metrics.time_to_implement_p50_hours).toBe(6);
    expect(metrics.validation_rate.value).toBe(1);
    expect(metrics.sla_breach_rate).toMatchObject({ numerator: 0, denominator: 0, value: null });
  });
});
