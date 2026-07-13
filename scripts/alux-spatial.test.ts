/**
 * CV6.6 · Unit tests para `deriveAluxSpatialProposals`.
 * Ejecutar con: `bun test scripts/alux-spatial.test.ts`
 *
 * Cubre:
 *  - Auto-Hide (fase no onsite / DC vacío / familia no accionable)
 *  - Traducción de tarjetas DC en propuestas con las 4 preguntas
 *  - Regla de No Saturación (máx 1 por slot, tope global)
 *  - Dedupe por sesión (`seenKeys`)
 *  - Confianza derivada de prioridad
 *  - Contrato Explainable by Default + reversible
 */
import { describe, expect, test } from "bun:test";
import {
  deriveAluxSpatialProposals,
  type AluxSpatialProposal,
} from "../src/lib/traveler/alux-spatial";
import type { DecisionCard, DecisionCenter } from "../src/lib/traveler/decision-center";
import type { LiveDayContext } from "../src/lib/traveler/live-day";

const NOW = new Date("2026-07-13T15:00:00Z");

function card(overrides: Partial<DecisionCard>): DecisionCard {
  return {
    id: "destination.traffic:leave-now:biz-1",
    slot: "now",
    priority: 90,
    tone: "warning",
    title: "Sal ahora",
    rationale: "20 min (12.3 km).",
    primaryAction: {
      id: "navigate",
      label: "Iniciar navegación",
      intent: "navigate",
    },
    sources: ["destination_context"],
    at: NOW.toISOString(),
    ...overrides,
  };
}

function center(cards: DecisionCard[]): DecisionCenter {
  const now = cards.filter((c) => c.slot === "now");
  const next = cards.filter((c) => c.slot === "next");
  const later = cards.filter((c) => c.slot === "later");
  return { now, next, later, empty: cards.length === 0 };
}

const emptyLiveDay: LiveDayContext = {
  day: 1,
  livePhase: "in-day",
  items: [],
  nowIndex: null,
  nextIndex: null,
};

describe("deriveAluxSpatialProposals (CV6.6)", () => {
  test("Auto-Hide · fase distinta de onsite retorna []", () => {
    const r = deriveAluxSpatialProposals({
      phase: "pre-trip",
      liveDay: emptyLiveDay,
      decisionCenter: center([card({})]),
      at: NOW,
    });
    expect(r).toEqual([]);
  });

  test("Auto-Hide · Decision Center vacío retorna []", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([]),
      at: NOW,
    });
    expect(r).toEqual([]);
  });

  test("Regla de Oportunidad · familia no accionable se omite (later.*)", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([
        card({ id: "later:item-x", slot: "later", tone: "neutral", priority: 20 }),
      ]),
      at: NOW,
    });
    expect(r).toEqual([]);
  });

  test("Traffic leave-now → propuesta con las 4 preguntas", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([card({})]),
      at: NOW,
    });
    expect(r).toHaveLength(1);
    const p = r[0] as AluxSpatialProposal;
    expect(p.headline).toBe("Sal ahora");
    expect(p.whatToDo.length).toBeGreaterThan(0);
    expect(p.whyItMatters.length).toBeGreaterThan(0);
    expect(p.expectedBenefit.length).toBeGreaterThan(0);
    expect(p.ifIgnored.length).toBeGreaterThan(0);
    expect(p.reversible).toBe(true);
    expect(p.confidence).toBe("high");
    expect(p.primaryCta.intent).toBe("navigate");
    expect(p.sources).toContain("decision_center");
  });

  test("Weather warning → propuesta reorganizar", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([
        card({
          id: "destination.weather:rain",
          slot: "next",
          priority: 55,
          tone: "warning",
          title: "Prepárate: probable lluvia",
          primaryAction: undefined,
        }),
      ]),
      at: NOW,
    });
    expect(r).toHaveLength(1);
    expect(r[0].headline).toContain("clima");
    // sin primaryAction del card → fallback "Ver en Mi Viaje"
    expect(r[0].primaryCta.intent).toBe("open_plan_item");
  });

  test("Hours closing → slot=now con confianza media", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([
        card({
          id: "destination.hours:closing:biz-3",
          slot: "now",
          priority: 72,
          tone: "warning",
          title: "Cierra pronto",
          primaryAction: undefined,
        }),
      ]),
      at: NOW,
    });
    expect(r).toHaveLength(1);
    expect(r[0].slot).toBe("now");
    expect(r[0].confidence).toBe("medium");
  });

  test("No Saturación · máximo 1 por slot", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([
        card({ id: "destination.traffic:leave-now:A" }),
        card({ id: "destination.traffic:likely-late:B", tone: "critical", priority: 92 }),
      ]),
      at: NOW,
    });
    // Ambos en slot=now → sólo se emite el de mayor peso (critical).
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("destination.traffic:likely-late:B");
  });

  test("No Saturación · tope global default = 2", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([
        card({ id: "destination.traffic:leave-now:A", slot: "now" }),
        card({ id: "destination.weather:rain", slot: "next", tone: "warning", priority: 55, primaryAction: undefined }),
        card({ id: "destination.hours:closing:C", slot: "later", tone: "warning", priority: 72, primaryAction: undefined }),
      ]),
      at: NOW,
    });
    expect(r.length).toBeLessThanOrEqual(2);
  });

  test("Dedupe por sesión · seenKeys omite propuestas repetidas", () => {
    const seen = new Set(["destination.traffic:leave-now:biz-1"]);
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([card({})]),
      at: NOW,
      seenKeys: seen,
    });
    expect(r).toEqual([]);
  });

  test("Learning Ready · feedback opcional no rompe contrato", () => {
    const r = deriveAluxSpatialProposals({
      phase: "onsite",
      liveDay: emptyLiveDay,
      decisionCenter: center([card({})]),
      at: NOW,
    });
    // No debe venir seteado por CV6.6, pero el tipo lo permite.
    expect(r[0].feedback).toBeUndefined();
  });
});