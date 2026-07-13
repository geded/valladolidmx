/**
 * CV6.7 · Unit tests para `deriveOnTripConciergeState`.
 * Ejecutar: `bun test scripts/on-trip-concierge.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  deriveOnTripConciergeState,
  type OnTripConciergeInput,
} from "../src/lib/traveler/on-trip-concierge";
import type { LiveDayContext } from "../src/lib/traveler/live-day";

const IN_HOURS = new Date("2026-07-13T18:00:00Z"); // 12:00 America/Merida
const OUT_HOURS = new Date("2026-07-13T05:00:00Z"); // 23:00 America/Merida (día previo)

const dayCtx: LiveDayContext = {
  day: 1,
  livePhase: "in-day",
  items: [],
  nowIndex: null,
  nextIndex: null,
};

const emptyCtx: LiveDayContext = {
  day: null,
  livePhase: "pre-day",
  items: [],
  nowIndex: null,
  nextIndex: null,
};

function base(overrides: Partial<OnTripConciergeInput> = {}): OnTripConciergeInput {
  return {
    phase: "onsite",
    liveDay: dayCtx,
    order: { status: "paid" },
    case: null,
    at: IN_HOURS,
    ...overrides,
  };
}

describe("deriveOnTripConciergeState (CV6.7)", () => {
  test("Auto-Hide · fuera de onsite", () => {
    const s = deriveOnTripConciergeState(base({ phase: "planning" }));
    expect(s.visible).toBe(false);
    expect(s.state).toBe("hidden");
    expect(s.explain.rules).toContain("phase!=onsite");
  });

  test("Auto-Hide · sin día activo", () => {
    const s = deriveOnTripConciergeState(base({ liveDay: emptyCtx }));
    expect(s.visible).toBe(false);
    expect(s.explain.rules).toContain("no_active_day");
  });

  test("Auto-Hide · sin caso y sin orden confirmada", () => {
    const s = deriveOnTripConciergeState(base({ order: null, case: null }));
    expect(s.visible).toBe(false);
    expect(s.explain.rules).toContain("no_case_no_confirmed_order");
  });

  test("Standby · orden paid en horario → CTA abrir caso", () => {
    const s = deriveOnTripConciergeState(base());
    expect(s.state).toBe("standby");
    expect(s.visible).toBe(true);
    expect(s.ctaIntent).toBe("open_case");
    expect(s.ctaLabel).toBe("Contactar Concierge");
    expect(s.slaLabel).toContain("30 min");
    expect(s.conciergeStatus).toContain("disponible");
    expect(s.explain.sources).toContain("concierge_orders");
  });

  test("Standby · fuera de horario → SLA horario laboral", () => {
    const s = deriveOnTripConciergeState(base({ at: OUT_HOURS }));
    expect(s.state).toBe("standby");
    expect(s.conciergeStatus).toContain("Fuera de horario");
    expect(s.slaLabel).toContain("horario laboral");
  });

  test("Case open · prioridad sobre standby", () => {
    const s = deriveOnTripConciergeState(
      base({ case: { id: "case-1" }, order: { status: "paid" } }),
    );
    expect(s.state).toBe("case_open");
    expect(s.ctaIntent).toBe("view_case");
    expect(s.ctaLabel).toBe("Ver expediente");
    expect(s.explain.sources).toContain("cc_cases");
  });

  test("Contrato Explainable by Default · campos obligatorios presentes", () => {
    const s = deriveOnTripConciergeState(base());
    expect(s.rationale.length).toBeGreaterThan(0);
    expect(s.ctaOutcome.length).toBeGreaterThan(0);
    expect(s.reversible).toBe(true);
    expect(s.slaLabel.length).toBeGreaterThan(0);
  });

  test("Evolution without Refactoring · channels declara TODAS las capacidades futuras", () => {
    const s = deriveOnTripConciergeState(base());
    // Todas las capacidades futuras deben estar declaradas ya.
    for (const ch of [
      "concierge",
      "chat",
      "voice",
      "call",
      "whatsapp",
      "sos",
      "incident",
      "ai_collab",
      "automation",
      "case_tracking",
    ] as const) {
      expect(s.channels).toContain(ch);
    }
    // Pero sólo `concierge` está activo en CV6.7.
    expect(s.activeChannels).toEqual(["concierge"]);
  });

  test("Determinismo · mismas entradas → mismas salidas", () => {
    const a = deriveOnTripConciergeState(base());
    const b = deriveOnTripConciergeState(base());
    expect(a).toEqual(b);
  });

  test("Orden no confirmada (draft) no activa standby", () => {
    const s = deriveOnTripConciergeState(base({ order: { status: "draft" } }));
    expect(s.visible).toBe(false);
  });
});