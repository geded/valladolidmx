import { describe, expect, it } from "vitest";
import { computeTripProgress } from "../src/lib/traveler/trip-progress";

const items = [
  { id: "a", item_kind: "business", position: 0, day_index: 0 },
  { id: "b", item_kind: "business", position: 1, day_index: 0 },
  { id: "c", item_kind: "product", position: 2, day_index: 1 },
  { id: "n", item_kind: "note", position: 3, day_index: 1 },
  { id: "x", item_kind: "business", position: 4, day_index: null },
];
const opts = { startDate: "2026-12-01", endDate: "2026-12-02", today: "2026-12-02" };

describe("avance del viaje", () => {
  it("las notas no cuentan como paradas", () => {
    expect(computeTripProgress(items, new Set(), opts).total).toBe(4);
  });
  it("cuenta hechas y porcentaje", () => {
    const p = computeTripProgress(items, new Set(["a", "b"]), opts);
    expect(p.done).toBe(2);
    expect(p.percent).toBe(50);
  });
  it("dentro de las fechas, hoy es el día 2 y la siguiente es la de hoy", () => {
    const p = computeTripProgress(items, new Set(), opts);
    expect(p.todayIndex).toBe(1);
    expect(p.nextItemId).toBe("c");
  });
  it("antes del viaje, la siguiente es la primera pendiente del día 1", () => {
    const p = computeTripProgress(items, new Set(["a"]), { ...opts, today: "2026-11-20" });
    expect(p.todayIndex).toBeNull();
    expect(p.nextItemId).toBe("b");
  });
  it("cuenta paradas sin día", () => {
    expect(computeTripProgress(items, new Set(), opts).unscheduled).toBe(1);
  });
});
