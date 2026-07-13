/**
 * CV6.8 · Unit tests para `deriveLiveRecap`.
 * Ejecutar: `bun test scripts/live-recap.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  deriveLiveRecap,
  type LiveRecapInput,
} from "../src/lib/traveler/live-recap";
import type { LiveDayContext, LiveDayItemInput } from "../src/lib/traveler/live-day";

const AT = new Date("2026-07-13T23:00:00Z");

function ctx(
  overrides: Partial<LiveDayContext> = {},
  items: LiveDayItemInput[] = [],
): LiveDayContext {
  return {
    day: 2,
    livePhase: "post-day",
    items,
    nowIndex: null,
    nextIndex: null,
    ...overrides,
  };
}

function base(overrides: Partial<LiveRecapInput> = {}): LiveRecapInput {
  return {
    phase: "onsite",
    liveDay: ctx(),
    planItems: [],
    endDate: "2026-07-15",
    at: AT,
    ...overrides,
  };
}

describe("deriveLiveRecap (CV6.8)", () => {
  test("Auto-Hide · fuera de onsite", () => {
    const r = deriveLiveRecap(base({ phase: "planning" }));
    expect(r.visible).toBe(false);
    expect(r.explain.rules).toContain("phase!=onsite");
  });

  test("Auto-Hide · livePhase != post-day", () => {
    const r = deriveLiveRecap(base({ liveDay: ctx({ livePhase: "in-day" }) }));
    expect(r.visible).toBe(false);
    expect(r.explain.rules).toContain("livePhase!=post-day");
  });

  test("Auto-Hide · sin valor real", () => {
    const r = deriveLiveRecap(base({ liveDay: ctx({ day: 2 }, []), planItems: [], endDate: null }));
    expect(r.visible).toBe(false);
    expect(r.explain.rules).toContain("no_real_value");
  });

  test("Ready · con highlights (ítem done) y sin mañana", () => {
    const items: LiveDayItemInput[] = [
      { id: "a", day_number: 2, status: "done", entity_type: "biz", entity_id: "cenote-x" },
    ];
    const r = deriveLiveRecap(
      base({ liveDay: ctx({ day: 2 }, items), planItems: items, endDate: null }),
    );
    expect(r.visible).toBe(true);
    expect(r.highlights.length).toBe(1);
    expect(r.highlights[0].sources).toContain("travel_plan_items");
    expect(r.state).toBe("ready");
  });

  test("Handoff-tomorrow · si existen ítems para day+1", () => {
    const todayItems: LiveDayItemInput[] = [
      { id: "a", day_number: 2, status: "done" },
    ];
    const tomorrow: LiveDayItemInput[] = [
      { id: "b", day_number: 3, starts_at: "2026-07-14T14:00:00Z" },
    ];
    const r = deriveLiveRecap(
      base({
        liveDay: ctx({ day: 2 }, todayItems),
        planItems: [...todayItems, ...tomorrow],
        endDate: "2026-07-15",
      }),
    );
    expect(r.state).toBe("handoff-tomorrow");
    expect(r.tomorrowPreview?.itemsCount).toBe(1);
    expect(r.tomorrowPreview?.day).toBe(3);
  });

  test("Handoff-post-trip · último día del viaje", () => {
    const at = new Date("2026-07-15T23:00:00Z");
    const items: LiveDayItemInput[] = [
      { id: "a", day_number: 4, status: "done" },
    ];
    const r = deriveLiveRecap({
      phase: "onsite",
      liveDay: ctx({ day: 4 }, items),
      planItems: items,
      endDate: "2026-07-15",
      at,
    });
    expect(r.state).toBe("handoff-post-trip");
    expect(r.tomorrowPreview).toBeNull();
  });

  test("Pendientes desde ítems del plan planned con starts_at pasado", () => {
    const items: LiveDayItemInput[] = [
      { id: "p1", day_number: 2, status: "planned", starts_at: "2026-07-13T18:00:00Z" },
    ];
    const r = deriveLiveRecap(
      base({ liveDay: ctx({ day: 2 }, items), planItems: items }),
    );
    expect(r.pendingItems.some((p) => p.id === "pi:p1")).toBe(true);
  });

  test("Explainable Summary · toda salida visible declara sources", () => {
    const items: LiveDayItemInput[] = [{ id: "a", day_number: 2, status: "done" }];
    const r = deriveLiveRecap(base({ liveDay: ctx({ day: 2 }, items), planItems: items }));
    expect(r.sources.length).toBeGreaterThan(0);
    r.highlights.forEach((h) => expect(h.sources.length).toBeGreaterThan(0));
  });

  test("Single Source Timeline · Decision Center aporta pendientes", () => {
    const items: LiveDayItemInput[] = [{ id: "a", day_number: 2, status: "done" }];
    const r = deriveLiveRecap(
      base({
        liveDay: ctx({ day: 2 }, items),
        planItems: items,
        decisionCenter: {
          now: [
            {
              id: "card-1",
              title: "Confirmar cena",
              rationale: "Reserva sin confirmar",
              tone: "warning",
              slot: "now",
              context: null,
              primaryAction: null,
              secondaryActions: [],
              planItemId: null,
              sources: ["decision_center"],
            } as never,
          ],
          next: [],
          later: [],
          empty: false,
        },
      }),
    );
    expect(r.pendingItems.some((p) => p.id === "dc:card-1")).toBe(true);
    expect(r.sources).toContain("decision_center");
  });

  test("Caso Concierge vigente aparece como pendiente prioritario", () => {
    const items: LiveDayItemInput[] = [{ id: "a", day_number: 2, status: "done" }];
    const r = deriveLiveRecap(
      base({
        liveDay: ctx({ day: 2 }, items),
        planItems: items,
        assistance: { state: "case_open", visible: true },
      }),
    );
    expect(r.pendingItems[0]?.id).toBe("pi:concierge_case");
    expect(r.sources).toContain("on_trip_concierge");
  });

  test("Determinismo · mismas entradas → mismas salidas", () => {
    const items: LiveDayItemInput[] = [{ id: "a", day_number: 2, status: "done" }];
    const a = deriveLiveRecap(base({ liveDay: ctx({ day: 2 }, items), planItems: items }));
    const b = deriveLiveRecap(base({ liveDay: ctx({ day: 2 }, items), planItems: items }));
    expect(a).toEqual(b);
  });
});