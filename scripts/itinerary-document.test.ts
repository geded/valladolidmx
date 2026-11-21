import { describe, expect, it } from "vitest";
import {
  addMinutes,
  buildItineraryModel,
  dayDateLabel,
  estimateLeg,
  type ItineraryItemInput,
} from "../src/lib/traveler/itinerary-document";
import {
  parseProgress,
  readProgress,
  toggleProgress,
} from "../src/lib/traveler/itinerary-progress";

const item = (over: Partial<ItineraryItemInput>): ItineraryItemInput => ({
  id: over.id ?? "i",
  item_kind: "business",
  target_id: null,
  position: 0,
  day_index: null,
  snapshot: { title: "Parada" },
  ...over,
});

describe("itinerario con marca · días", () => {
  it("agrupa por día en orden, con fecha legible y «Por agendar» al final", () => {
    const m = buildItineraryModel(
      [
        item({ id: "c", position: 3, day_index: null }),
        item({ id: "b", position: 2, day_index: 1, starts_at_local: "18:00" }),
        item({
          id: "a",
          position: 1,
          day_index: 0,
          starts_at_local: "09:00",
          duration_minutes: 90,
        }),
      ],
      { startDate: "2026-07-25" },
    );
    expect(m.days.map((d) => d.title)).toEqual(["Día 1", "Día 2", "Por agendar"]);
    expect(m.days[0]?.dateLabel).toContain("25 de julio");
    expect(dayDateLabel("2026-07-25", 1)).toBe("Domingo 26 de julio");
    expect(m.days[0]?.stops[0]?.endTime).toBe("10:30");
    expect(m.datedDayCount).toBe(2);
    expect(m.stopCount).toBe(3);
  });

  it("sin días asignados muestra un solo recorrido y separa las notas", () => {
    const m = buildItineraryModel(
      [
        item({ id: "d", item_kind: "destination", snapshot: { title: "Valladolid" } }),
        item({ id: "n", item_kind: "note", snapshot: { title: "Contexto del viaje" } }),
      ],
      { startDate: null },
    );
    expect(m.days).toHaveLength(1);
    expect(m.days[0]?.title).toBe("Tu recorrido");
    expect(m.notes.map((n) => n.title)).toEqual(["Contexto del viaje"]);
    expect(m.destinations).toEqual(["Valladolid"]);
  });

  it("marca como reservada sólo la parada cuyo lugar reservó el concierge", () => {
    const m = buildItineraryModel(
      [
        item({ id: "h", target_id: "hotel-1" }),
        item({ id: "r", position: 1, target_id: "rest-1" }),
      ],
      { startDate: null, reservedTargetIds: new Set(["hotel-1"]) },
    );
    expect(m.days[0]?.stops.map((s) => s.reserved)).toEqual([true, false]);
  });
});

describe("itinerario con marca · traslados", () => {
  it("calcula traslado sólo entre paradas con ubicación", () => {
    const geo = new Map([
      ["a", { lat: 20.6896, lng: -88.2015 }],
      ["b", { lat: 20.6905, lng: -88.1995 }],
    ]);
    const m = buildItineraryModel(
      [
        item({ id: "a", day_index: 0 }),
        item({ id: "b", position: 1, day_index: 0 }),
        item({ id: "c", position: 2, day_index: 0 }),
      ],
      { startDate: null, geo },
    );
    const stops = m.days[0]?.stops ?? [];
    expect(stops[0]?.legToNext?.mode).toBe("walk");
    expect(stops[1]?.legToNext).toBeNull();
    expect(stops[0]?.mapsUrl).toContain("destination=20.6896,-88.2015");
    expect(stops[2]?.mapsUrl).toContain("maps/search");
  });

  it("Valladolid → Chichén Itzá (~40 km) va en auto", () => {
    const leg = estimateLeg({ lat: 20.6896, lng: -88.2015 }, { lat: 20.6843, lng: -88.5678 });
    expect(leg.mode).toBe("drive");
    expect(leg.km).toBeGreaterThan(40);
    expect(leg.minutes).toBeGreaterThan(30);
  });

  it("no inventa la hora de fin después de medianoche", () => {
    expect(addMinutes("23:30", 60)).toBeNull();
    expect(addMinutes(null, 60)).toBeNull();
  });
});

describe("paradas hechas · sólo en el teléfono", () => {
  class Mem {
    m = new Map<string, string>();
    getItem(k: string) {
      return this.m.get(k) ?? null;
    }
    setItem(k: string, v: string) {
      this.m.set(k, v);
    }
    removeItem(k: string) {
      this.m.delete(k);
    }
  }
  it("marca y desmarca por viaje sin mezclar viajes", () => {
    const s = new Mem();
    toggleProgress("plan-1", "a", s);
    toggleProgress("plan-1", "b", s);
    toggleProgress("plan-2", "a", s);
    toggleProgress("plan-1", "a", s);
    expect(readProgress("plan-1", s)).toEqual(["b"]);
    expect(readProgress("plan-2", s)).toEqual(["a"]);
  });
  it("ignora datos dañados", () => {
    expect(parseProgress("{oops")).toEqual([]);
    expect(parseProgress(JSON.stringify({ done: [1, "x"] }))).toEqual(["x"]);
  });
});

describe("itinerario con marca · paradas del concierge", () => {
  it("muestra el nombre real en vez de «Elemento»", async () => {
    const { snapshotTitle, snapshotSubtitle } =
      await import("../src/lib/traveler/itinerary-document");
    expect(snapshotTitle({ name: "Suite Selva Maya" })).toBe("Suite Selva Maya");
    expect(snapshotTitle({ label: "Preferencias y logística" })).toBe("Preferencias y logística");
    expect(snapshotSubtitle({ product_type: "hotel", business: "Hacienda Selva Maya" })).toBe(
      "Hospedaje · Hacienda Selva Maya",
    );
  });
});
