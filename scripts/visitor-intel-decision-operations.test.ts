import { describe, expect, it } from "vitest";

import {
  buildDecisionLifecycleEvent,
  canReplaceDecisionAgreement,
  canTransitionDecision,
  decisionSubjectId,
  filterDecisionQueueForActor,
  resolveDecisionActorAccess,
} from "@/lib/visitor-intel/decision-operations";
import {
  projectDecisionQueue,
  type DecisionEventPayload,
  type DecisionSource,
} from "@/lib/visitor-intel/decisions";

const NOW = new Date("2026-07-20T18:00:00.000Z");
const FOUNDER = "10000000-0000-4000-8000-000000000001";
const OWNER = "20000000-0000-4000-8000-000000000002";
const OTHER = "30000000-0000-4000-8000-000000000003";
const DECISION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DECISION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const source: DecisionSource = {
  origin: "cv87_priority",
  opportunity_id: "jpr_global",
  metric_id: "JPR_30D",
  transition: "aggregate",
  priority_score: 0.88,
  learned_confidence: 0.7,
};

function proposed(decisionId: string, minute: number): DecisionEventPayload {
  return {
    decision_id: decisionId,
    from_state: null,
    to_state: "proposed",
    source,
    actor_user_id: FOUNDER,
    actor_role: "founder",
    occurred_at: `2026-07-20T10:${String(minute).padStart(2, "0")}:00.000Z`,
  };
}

function accepted(decisionId: string, ownerUserId: string, minute: number): DecisionEventPayload {
  return {
    decision_id: decisionId,
    from_state: "proposed",
    to_state: "accepted",
    agreement: {
      action: "Corregir fricción",
      rationale: "La evidencia agregada lo justifica",
      owner_user_id: ownerUserId,
      expected_kpi_id: "JPR_30D",
      expected_direction: "up",
      expected_delta_relative: 0.1,
      evaluation_window_days: 7,
    },
    actor_user_id: FOUNDER,
    actor_role: "founder",
    occurred_at: `2026-07-20T10:${String(minute).padStart(2, "0")}:00.000Z`,
  };
}

describe("CV8.9.2 · role mapping", () => {
  it("maps super_admin to Founder and applies secure precedence", () => {
    expect(
      resolveDecisionActorAccess(FOUNDER, {
        super_admin: true,
        admin: true,
        concierge_lead: true,
        editor: true,
      }),
    ).toEqual({
      user_id: FOUNDER,
      system_role: "super_admin",
      actor_role: "founder",
      manage_all: true,
    });
  });

  it("fails closed when no Action Queue role exists", () => {
    expect(
      resolveDecisionActorAccess(OTHER, {
        super_admin: false,
        admin: false,
        concierge_lead: false,
        editor: false,
      }),
    ).toBeNull();
  });
});

describe("CV8.9.2 · assigned-only permissions", () => {
  const projection = projectDecisionQueue(
    [
      proposed(DECISION_A, 0),
      accepted(DECISION_A, OWNER, 1),
      proposed(DECISION_B, 2),
      accepted(DECISION_B, OTHER, 3),
    ],
    { now: NOW },
  );
  const owned = projection.decisions.find((d) => d.decision_id === DECISION_A)!;
  const notOwned = projection.decisions.find((d) => d.decision_id === DECISION_B)!;
  const founder = resolveDecisionActorAccess(FOUNDER, {
    super_admin: true,
    admin: false,
    concierge_lead: false,
    editor: false,
  })!;
  const assignee = resolveDecisionActorAccess(OWNER, {
    super_admin: false,
    admin: false,
    concierge_lead: true,
    editor: false,
  })!;

  it("lets Founder manage every contract transition and agreement", () => {
    expect(canTransitionDecision(founder, owned, "dismissed")).toBe(true);
    expect(canReplaceDecisionAgreement(founder)).toBe(true);
  });

  it("lets Concierge Lead advance only an assigned decision", () => {
    expect(canTransitionDecision(assignee, owned, "in_progress")).toBe(true);
    expect(canTransitionDecision(assignee, owned, "dismissed")).toBe(false);
    expect(canTransitionDecision(assignee, notOwned, "in_progress")).toBe(false);
    expect(canReplaceDecisionAgreement(assignee)).toBe(false);
  });

  it("filters decisions, buckets, SLA and feedback by assignment", () => {
    const filtered = filterDecisionQueueForActor(projection, assignee);
    expect(filtered.decisions.map((d) => d.decision_id)).toEqual([DECISION_A]);
    expect(filtered.queue_buckets.this_week).toEqual([DECISION_A]);
    expect(filtered.queue_buckets.today).toEqual([]);
  });
});

describe("CV8.9.2 · auditable envelope", () => {
  it("uses an operational subject and preserves the server-stamped actor", () => {
    const payload = proposed(DECISION_A, 0);
    const event = buildDecisionLifecycleEvent({
      event_id: "99999999-9999-4999-8999-999999999999",
      payload,
    });
    expect(event.kind).toBe("recommendation.lifecycle");
    expect(event.subtype).toBe("decision");
    expect(event.subject.subject_id).toBe(decisionSubjectId(DECISION_A));
    expect(event.subject.subject_id).not.toBe(payload.actor_user_id);
    expect(event.payload?.actor_role).toBe("founder");
  });
});
