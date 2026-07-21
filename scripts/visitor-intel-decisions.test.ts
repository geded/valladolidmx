import { describe, expect, it } from "vitest";

import {
  DECISION_ALLOWED_TRANSITIONS,
  DECISION_CONTRACT_VERSION,
  DecisionEventPayloadSchema,
  decisionSourceFromPrioritizedOpportunity,
  decisionSourceFromSegmentFinding,
  projectDecisionQueue,
  type DecisionAgreement,
  type DecisionEventPayload,
  type DecisionSource,
} from "@/lib/visitor-intel/decisions";
import { VISITOR_EVENT_SCHEMA_VERSION, VisitorEventSchema } from "@/lib/visitor-intel/events";
import type { PrioritizedOpportunity } from "@/lib/visitor-intel/prioritization";
import type { SegmentFinding } from "@/lib/visitor-intel/segment-prioritization";
import { validateIngestEvent } from "@/lib/visitor-intel/ingest.functions";

const NOW = new Date("2026-07-20T18:00:00.000Z");
const ACTOR = "10000000-0000-4000-8000-000000000001";
const IDS = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  c: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  d: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  e: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
} as const;

const source: DecisionSource = {
  origin: "manual",
  metric_id: "JPR_30D",
  transition: "aggregate",
  priority_score: 0.8,
};

const agreement: DecisionAgreement = {
  action: "Corregir la fricción observada",
  rationale: "La evidencia agregada muestra una caída sostenida",
  owner_user_id: ACTOR,
  expected_kpi_id: "JPR_30D",
  expected_direction: "up",
  expected_delta_relative: 0.1,
  evaluation_window_days: 7,
  due_at: "2026-07-24T18:00:00.000Z",
};

function proposed(
  decisionId: string,
  occurredAt: string,
  extra: Partial<DecisionEventPayload> = {},
): DecisionEventPayload {
  return {
    decision_id: decisionId,
    from_state: null,
    to_state: "proposed",
    source,
    actor_user_id: ACTOR,
    actor_role: "founder",
    occurred_at: occurredAt,
    ...extra,
  };
}

function transition(
  decisionId: string,
  fromState: DecisionEventPayload["from_state"],
  toState: DecisionEventPayload["to_state"],
  occurredAt: string,
  extra: Partial<DecisionEventPayload> = {},
): DecisionEventPayload {
  return {
    decision_id: decisionId,
    from_state: fromState,
    to_state: toState,
    actor_user_id: ACTOR,
    actor_role: "admin",
    occurred_at: occurredAt,
    ...extra,
  };
}

const evidence = {
  metric_id: "JPR_30D",
  observed_delta_relative: 0.14,
  sample_size: 125,
  window_start: "2026-07-12T10:00:00.000Z",
  window_end: "2026-07-20T10:00:00.000Z",
};

describe("CV8.9.1 · Action Queue contract", () => {
  it("congela v1.0.0 y rechaza regresiones terminales", () => {
    expect(DECISION_CONTRACT_VERSION).toBe("1.0.0");
    expect(DECISION_ALLOWED_TRANSITIONS.validated).toEqual([]);
    expect(DECISION_ALLOWED_TRANSITIONS.rejected).toEqual([]);
    expect(
      DecisionEventPayloadSchema.safeParse(
        transition(IDS.a, "validated", "in_progress", "2026-07-20T11:00:00.000Z"),
      ).success,
    ).toBe(false);
  });

  it("exige acuerdo al aceptar, motivo al pausar y evidencia al cerrar", () => {
    expect(
      DecisionEventPayloadSchema.safeParse(
        transition(IDS.a, "proposed", "accepted", "2026-07-20T11:00:00.000Z"),
      ).success,
    ).toBe(false);
    expect(
      DecisionEventPayloadSchema.safeParse(
        transition(IDS.a, "in_progress", "blocked", "2026-07-20T12:00:00.000Z"),
      ).success,
    ).toBe(false);
    expect(
      DecisionEventPayloadSchema.safeParse(
        transition(IDS.a, "implemented", "validated", "2026-07-20T13:00:00.000Z"),
      ).success,
    ).toBe(false);
  });

  it("extiende recommendation.lifecycle sin romper el evento CV8.6", () => {
    const envelope = {
      event_id: "99999999-9999-4999-8999-999999999999",
      occurred_at: "2026-07-20T10:00:00.000Z",
      schema_version: VISITOR_EVENT_SCHEMA_VERSION,
      subject: {
        subject_id: ACTOR,
        trust_level: "N4_transactional" as const,
        is_authenticated: true,
      },
      context: { surface: "cms:visitor-intel", route: "/cms/visitor-intel" },
      kind: "recommendation.lifecycle" as const,
    };
    const legacy = VisitorEventSchema.safeParse({
      ...envelope,
      recommendation: {
        recommendation_id: "rec-1",
        metric_id: "JPR_30D",
        transition: "aggregate",
        severity: "attention",
        status: "detected",
        actor: ACTOR,
      },
    });
    const decision = VisitorEventSchema.safeParse({
      ...envelope,
      subtype: "decision",
      payload: proposed(IDS.a, "2026-07-20T10:00:00.000Z"),
    });
    expect(legacy.success).toBe(true);
    expect(decision.success).toBe(true);
    if (!decision.success) throw new Error("decision event should parse");
    expect(validateIngestEvent(decision.data)).toEqual({
      accepted: false,
      reason: "decision_channel_required",
    });
  });
});

describe("CV8.9.1 · projectDecisionQueue", () => {
  it("recompone un cierre validado desde eventos desordenados y emite feedback CV8.6", () => {
    const events = [
      transition(IDS.a, "implemented", "validated", "2026-07-20T10:00:00.000Z", {
        evidence,
      }),
      proposed(IDS.a, "2026-07-12T10:00:00.000Z"),
      transition(IDS.a, "accepted", "in_progress", "2026-07-13T10:00:00.000Z"),
      transition(IDS.a, "proposed", "accepted", "2026-07-12T11:00:00.000Z", {
        agreement,
      }),
      transition(IDS.a, "in_progress", "implemented", "2026-07-13T12:00:00.000Z"),
    ];
    const result = projectDecisionQueue(events, { now: NOW });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]?.current_state).toBe("validated");
    expect(result.decisions[0]?.history).toHaveLength(5);
    expect(result.feedback_to_cv86).toEqual([
      {
        decision_id: IDS.a,
        metric_id: "JPR_30D",
        outcome: "validated",
        occurred_at: "2026-07-20T10:00:00.000Z",
      },
    ]);
    expect(result.issues).toEqual([]);
  });

  it("clasifica Hoy, Esta semana, Esperando validación y Vencidas", () => {
    const overdueAgreement = {
      ...agreement,
      due_at: "2026-07-19T18:00:00.000Z",
    };
    const events = [
      proposed(IDS.a, "2026-07-20T08:00:00.000Z"),
      proposed(IDS.b, "2026-07-18T08:00:00.000Z"),
      transition(IDS.b, "proposed", "accepted", "2026-07-18T09:00:00.000Z", {
        agreement: overdueAgreement,
      }),
      proposed(IDS.c, "2026-07-18T10:00:00.000Z"),
      transition(IDS.c, "proposed", "accepted", "2026-07-18T11:00:00.000Z", {
        agreement: { ...agreement, due_at: "2026-07-18T18:00:00.000Z" },
      }),
      transition(IDS.c, "accepted", "in_progress", "2026-07-18T12:00:00.000Z"),
      transition(IDS.c, "in_progress", "implemented", "2026-07-19T12:00:00.000Z"),
      proposed(IDS.d, "2026-07-17T10:00:00.000Z"),
      transition(IDS.d, "proposed", "accepted", "2026-07-17T11:00:00.000Z", {
        agreement: { ...agreement, evaluation_window_days: 1 },
      }),
      transition(IDS.d, "accepted", "in_progress", "2026-07-17T12:00:00.000Z"),
      transition(IDS.d, "in_progress", "implemented", "2026-07-18T12:00:00.000Z"),
      proposed(IDS.e, "2026-07-19T10:00:00.000Z"),
      transition(IDS.e, "proposed", "accepted", "2026-07-19T11:00:00.000Z", {
        agreement,
      }),
    ];
    const result = projectDecisionQueue(events, { now: NOW });

    expect(result.queue_buckets.today).toEqual([IDS.a]);
    expect(result.queue_buckets.this_week).toEqual([IDS.e]);
    expect(result.queue_buckets.waiting_validation).toEqual([IDS.c]);
    expect(result.queue_buckets.overdue).toEqual([IDS.b, IDS.d]);
    expect(result.sla_flags).toContainEqual({
      decision_id: IDS.a,
      flag: "no_owner",
    });
    expect(result.sla_flags).toContainEqual({
      decision_id: IDS.a,
      flag: "no_kpi",
    });
    expect(result.sla_flags.some((flag) => flag.flag === "validation_window_expired")).toBe(true);
  });

  it("mantiene blocked/deferred reversibles y terminales inmutables", () => {
    const events = [
      proposed(IDS.a, "2026-07-10T08:00:00.000Z"),
      transition(IDS.a, "proposed", "accepted", "2026-07-10T09:00:00.000Z", {
        agreement,
      }),
      transition(IDS.a, "accepted", "in_progress", "2026-07-10T10:00:00.000Z"),
      transition(IDS.a, "in_progress", "blocked", "2026-07-10T11:00:00.000Z", {
        reason: "Dependencia externa",
      }),
      transition(IDS.a, "blocked", "in_progress", "2026-07-11T08:00:00.000Z"),
      transition(IDS.a, "in_progress", "deferred", "2026-07-11T09:00:00.000Z", {
        reason: "Mover a la siguiente ventana",
      }),
      transition(IDS.a, "deferred", "accepted", "2026-07-12T08:00:00.000Z", {
        agreement,
      }),
    ];
    const result = projectDecisionQueue(events, { now: NOW });
    expect(result.decisions[0]?.current_state).toBe("accepted");
    expect(result.issues).toEqual([]);
  });

  it("no aplica eventos con estado declarado distinto de la proyección", () => {
    const result = projectDecisionQueue(
      [
        proposed(IDS.a, "2026-07-20T08:00:00.000Z"),
        transition(IDS.a, "proposed", "accepted", "2026-07-20T09:00:00.000Z", {
          agreement,
        }),
        transition(IDS.a, "proposed", "deferred", "2026-07-20T10:00:00.000Z", {
          reason: "Evento rezagado",
        }),
      ],
      { now: NOW },
    );
    expect(result.decisions[0]?.current_state).toBe("accepted");
    expect(result.decisions[0]?.history.at(-1)).toMatchObject({
      applied: false,
      issue: "state_mismatch",
    });
    expect(result.issues[0]?.code).toBe("state_mismatch");
  });

  it("separa reemplazos sin mutar la decisión original", () => {
    const result = projectDecisionQueue(
      [
        proposed(IDS.a, "2026-07-19T08:00:00.000Z"),
        proposed(IDS.b, "2026-07-20T08:00:00.000Z", {
          supersedes_decision_id: IDS.a,
        }),
      ],
      { now: NOW },
    );
    expect(result.queue_buckets.superseded).toEqual([IDS.a]);
    expect(result.decisions.find((d) => d.decision_id === IDS.a)).toMatchObject({
      current_state: "proposed",
      superseded_by_decision_id: IDS.b,
    });
  });

  it("es determinista con now explícito", () => {
    const events = [proposed(IDS.a, "2026-07-20T08:00:00.000Z")];
    expect(projectDecisionQueue(events, { now: NOW })).toEqual(
      projectDecisionQueue(events, { now: NOW }),
    );
  });
});

describe("CV8.9.1 · adaptadores sin snapshots paralelos", () => {
  it("reutiliza score y confianza de CV8.7", () => {
    const prioritized = {
      score: 0.91,
      learned_confidence: 0.73,
      opportunity: {
        id: "transition_T3_identified_to_explorer",
        metric_id: "T3_conversion",
        transition: "T3_identified_to_explorer",
      },
    } as PrioritizedOpportunity;
    expect(decisionSourceFromPrioritizedOpportunity(prioritized)).toEqual({
      origin: "cv87_priority",
      opportunity_id: "transition_T3_identified_to_explorer",
      metric_id: "T3_conversion",
      transition: "T3_identified_to_explorer",
      priority_score: 0.91,
      learned_confidence: 0.73,
    });
  });

  it("sólo proyecta segmentos activos de CV8.8 con evidencia suficiente", () => {
    const finding = {
      dimension: "locale",
      segment_key: "en",
      type: "inclusion_opportunity",
      score: 0.84,
    } as SegmentFinding;
    expect(
      decisionSourceFromSegmentFinding(finding, {
        opportunity_id: "segment:locale:en:inclusion",
        learned_confidence: 0.64,
      }),
    ).toEqual({
      origin: "cv88_segment",
      opportunity_id: "segment:locale:en:inclusion",
      metric_id: "JPR_30D",
      transition: "aggregate",
      segment: { dimension: "locale", value: "en" },
      priority_score: 0.84,
      learned_confidence: 0.64,
    });
    expect(
      decisionSourceFromSegmentFinding(
        { ...finding, type: "insufficient_data" },
        { opportunity_id: "suppressed" },
      ),
    ).toBeNull();
  });
});
