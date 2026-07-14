/**
 * CV8.2 · Journey State Projection — pure derivation test.
 *
 * Verifica Founder Journey State Principle:
 *  - Sin eventos → stranger, confidence 0.
 *  - Sólo transiciones canónicas avanzan; no-canónicas se ignoran.
 *  - Avance monotónico (nunca retrocede).
 *  - Confianza acumulada por intent/decision/outcome.
 *  - Determinismo (dos runs = idéntico DTO salvo computed_at).
 *  - Cobertura de las 9 transiciones canónicas T1..T9.
 */
import { describe, expect, it } from "vitest";

import {
  VISITOR_EVENT_SCHEMA_VERSION,
  type VisitorEvent,
} from "@/lib/visitor-intel/events";
import {
  JOURNEY_TRANSITIONS,
  type JourneyTransitionId,
} from "@/lib/visitor-intel/journey";
import { projectVisitorState } from "@/lib/visitor-intel/projection";

const SUBJECT = "550e8400-e29b-41d4-a716-446655440000";
const NOW = new Date("2026-07-14T12:00:00.000Z");

function mkTransition(
  id: JourneyTransitionId,
  offsetMinutes: number,
): VisitorEvent {
  const t = JOURNEY_TRANSITIONS[id];
  return {
    event_id: `evt-${id}`,
    occurred_at: new Date(NOW.getTime() + offsetMinutes * 60_000).toISOString(),
    schema_version: VISITOR_EVENT_SCHEMA_VERSION,
    subject: {
      subject_id: SUBJECT,
      trust_level: "N1_continuity",
      is_authenticated: true,
    },
    context: { surface: "test", route: "/test" },
    kind: "journey.transition",
    transition: {
      id: t.id,
      from: t.from,
      to: t.to,
      influencing_capabilities: [],
    },
  };
}

describe("CV8.2 · Journey State Projection", () => {
  it("returns stranger for empty history", () => {
    const s = projectVisitorState(SUBJECT, [], NOW);
    expect(s.current_stage).toBe("stranger");
    expect(s.confidence).toBe(0);
    expect(s.history).toEqual([]);
    expect(s.last_transition).toBeNull();
  });

  it("covers all 9 canonical transitions T1..T9 in order", () => {
    const evts: VisitorEvent[] = (Object.keys(JOURNEY_TRANSITIONS) as JourneyTransitionId[])
      .map((id, i) => mkTransition(id, i));
    const s = projectVisitorState(SUBJECT, evts, NOW);
    expect(s.current_stage).toBe("ambassador");
    expect(s.history).toHaveLength(9);
    expect(s.last_transition?.transition_id).toBe("T9_traveler_to_ambassador");
  });

  it("never regresses (monotonic advance)", () => {
    const forward = mkTransition("T4_explorer_to_interested", 10);
    // Fabricated backward attempt — should be ignored by the projection.
    const backward: VisitorEvent = {
      ...mkTransition("T1_stranger_to_anonymous", 20),
    };
    const s = projectVisitorState(SUBJECT, [forward, backward], NOW);
    expect(s.current_stage).toBe("interested");
  });

  it("ignores non-canonical transition ids", () => {
    const bogus: VisitorEvent = {
      event_id: "evt-bogus",
      occurred_at: NOW.toISOString(),
      schema_version: VISITOR_EVENT_SCHEMA_VERSION,
      subject: { subject_id: SUBJECT, trust_level: "N0_anonymous", is_authenticated: false },
      context: { surface: "test", route: "/" },
      kind: "journey.transition",
      transition: {
        id: "T99_made_up",
        from: "stranger",
        to: "anonymous",
        influencing_capabilities: [],
      },
    };
    const s = projectVisitorState(SUBJECT, [bogus], NOW);
    expect(s.current_stage).toBe("stranger");
  });

  it("accumulates confidence from intent/decision/outcome without changing stage", () => {
    const enter = mkTransition("T4_explorer_to_interested", 0);
    const intent: VisitorEvent = {
      event_id: "evt-intent",
      occurred_at: new Date(NOW.getTime() + 60_000).toISOString(),
      schema_version: VISITOR_EVENT_SCHEMA_VERSION,
      subject: { subject_id: SUBJECT, trust_level: "N1_continuity", is_authenticated: true },
      context: { surface: "test", route: "/" },
      kind: "intent.signal",
      intent: { action: "favorite", target_type: "business", strength: 1 },
    };
    const outcome: VisitorEvent = {
      event_id: "evt-outcome",
      occurred_at: new Date(NOW.getTime() + 120_000).toISOString(),
      schema_version: VISITOR_EVENT_SCHEMA_VERSION,
      subject: { subject_id: SUBJECT, trust_level: "N1_continuity", is_authenticated: true },
      context: { surface: "test", route: "/" },
      kind: "outcome.observed",
      outcome: { traveler_value: 0.9 },
    };
    const s = projectVisitorState(SUBJECT, [enter, intent, outcome], NOW);
    expect(s.current_stage).toBe("interested");
    expect(s.confidence).toBeGreaterThan(0.5);
    expect(s.justifying_event_ids).toContain("evt-intent");
    expect(s.justifying_event_ids).toContain("evt-outcome");
  });

  it("is deterministic — same input yields same output (except computed_at)", () => {
    const evts = [
      mkTransition("T1_stranger_to_anonymous", 0),
      mkTransition("T2_anonymous_to_identified", 1),
      mkTransition("T4_explorer_to_interested", 2),
    ];
    const a = projectVisitorState(SUBJECT, evts, NOW);
    const b = projectVisitorState(SUBJECT, evts, NOW);
    expect(a).toEqual(b);
  });
});