import { describe, expect, test } from "bun:test";
import { buildDaySchedule } from "../src/lib/traveler/day-schedule";

describe("CV6.7 · horario sugerido del día", () => {
  test("propone horas en orden y respeta la apertura del lugar", () => {
    const res = buildDaySchedule([
      { id: "a", item_kind: "business", openSlots: [{ opens: "11:00", closes: "18:00" }] },
      { id: "b", item_kind: "place" },
    ]);
    expect(res.assignments[0].startsAtLocal).toBe("11:00");
    expect(res.assignments[1].startsAtLocal).toBe("12:45");
    expect(res.assignments.every((a) => !a.locked)).toBe(true);
  });

  test("no mueve lo confirmado por el viajero o el concierge", () => {
    const res = buildDaySchedule([
      {
        id: "a",
        item_kind: "business",
        starts_at_local: "08:00",
        schedule_source: "traveler",
        duration_minutes: 60,
      },
      { id: "b", item_kind: "business" },
    ]);
    expect(res.assignments[0]).toMatchObject({ startsAtLocal: "08:00", locked: true });
    expect(res.assignments[1].startsAtLocal).toBe("09:15");
  });

  test("omite lugares cerrados ese día y lo explica", () => {
    const res = buildDaySchedule([{ id: "a", item_kind: "business", closedToday: true }]);
    expect(res.assignments).toHaveLength(0);
    expect(res.skipped).toEqual(["a"]);
    expect(res.rationale).toContain("cerrado");
  });
});
