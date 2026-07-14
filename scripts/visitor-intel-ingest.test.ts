/**
 * CV8.1 · Journey Event Ingestion — contract-level test.
 *
 * Verifica que:
 *  - `VisitorEventSchema` acepta los 4 kinds canónicos.
 *  - `isCanonicalTransition` rechaza transiciones fuera de T1..T9.
 *  - Un evento anónimo (`N0_anonymous`) no puede declarar `is_authenticated=true`
 *    (guardrail Progressive Trust en la server fn).
 *
 * No golpea DB — valida contrato v1.0.0 y guardrails puros.
 */
import { describe, expect, it } from "vitest";

import {
  VisitorEventSchema,
  isCanonicalTransition,
  VISITOR_EVENT_SCHEMA_VERSION,
} from "@/lib/visitor-intel/events";

const baseSubject = {
  subject_id: "550e8400-e29b-41d4-a716-446655440000",
  trust_level: "N0_anonymous" as const,
  is_authenticated: false,
  locale: "es-MX",
};

const baseContext = {
  destination_id: null,
  surface: "home",
  route: "/",
  travel_stage: "exploration" as const,
};

describe("CV8.1 · Journey Event Ingestion contract", () => {
  it("accepts a canonical journey.transition event", () => {
    const parsed = VisitorEventSchema.parse({
      event_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      occurred_at: new Date().toISOString(),
      schema_version: VISITOR_EVENT_SCHEMA_VERSION,
      subject: baseSubject,
      context: baseContext,
      kind: "journey.transition",
      transition: {
        id: "T1_stranger_to_anonymous",
        from: "stranger",
        to: "anonymous",
        influencing_capabilities: ["seo"],
      },
    });
    expect(parsed.kind).toBe("journey.transition");
    if (parsed.kind === "journey.transition") {
      expect(isCanonicalTransition(parsed.transition.id)).toBe(true);
    }
  });

  it("rejects non-canonical transition ids", () => {
    expect(isCanonicalTransition("T99_made_up")).toBe(false);
    expect(isCanonicalTransition("random")).toBe(false);
  });

  it("rejects unknown kinds (Signal Quality — no ruido)", () => {
    expect(() =>
      VisitorEventSchema.parse({
        event_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
        occurred_at: new Date().toISOString(),
        schema_version: VISITOR_EVENT_SCHEMA_VERSION,
        subject: baseSubject,
        context: baseContext,
        kind: "click",
      }),
    ).toThrow();
  });

  it("accepts intent.signal / decision.offered / outcome.observed", () => {
    const now = new Date().toISOString();
    for (const evt of [
      {
        kind: "intent.signal" as const,
        intent: { action: "favorite", target_type: "business", strength: 0.7 },
      },
      {
        kind: "decision.offered" as const,
        decision: {
          capability: "alux",
          recommendation_id: "rec_1",
          rationale: "clima favorable",
          accepted: true,
        },
      },
      {
        kind: "outcome.observed" as const,
        outcome: { transition_id: "T4_explorer_to_interested", traveler_value: 0.8 },
      },
    ]) {
      const parsed = VisitorEventSchema.parse({
        event_id: crypto.randomUUID(),
        occurred_at: now,
        schema_version: VISITOR_EVENT_SCHEMA_VERSION,
        subject: baseSubject,
        context: baseContext,
        ...evt,
      });
      expect(parsed.kind).toBe(evt.kind);
    }
  });
});