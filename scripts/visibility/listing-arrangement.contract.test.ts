import { describe, expect, test } from "bun:test";
import { arrangeListing, meridaIsoDay } from "@/lib/visibility/commercial-slots";

const seed = "2026-11-23:listado:hoteles";

function entry(id: string, weight = 0, extra: { businessId?: string; pinned?: boolean } = {}) {
  return { item: id, businessId: extra.businessId ?? id, weight, pinned: extra.pinned };
}

describe("Listados completos · fórmula aprobada de visibilidad", () => {
  test("el primer lugar de cada bloque de 4 es para un paquete vigente", () => {
    const list = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => entry(id));
    list[6] = entry("g", 60);
    const out = arrangeListing(list, seed);
    expect(out[0]?.item).toBe("g");
    expect(out[0]?.labeled).toBe(true);
    expect(out.slice(1).every((slot) => slot.origin === "organic")).toBe(true);
  });

  test("nunca oculta fichas: todas aparecen una sola vez", () => {
    const list = ["a", "b", "c", "d", "e"].map((id, i) => entry(id, i % 2 === 0 ? 55 : 0));
    const out = arrangeListing(list, seed);
    expect(out.map((slot) => slot.item).sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("máximo 1 contratada de cada 4 tarjetas", () => {
    const list = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => entry(id, 55));
    const out = arrangeListing(list, seed);
    const labeledPositions = out.flatMap((slot, i) => (slot.labeled ? [i] : []));
    expect(labeledPositions).toEqual([0, 4]);
  });

  test("una empresa ocupa como máximo un espacio contratado por listado", () => {
    const list = [
      entry("p1", 90, { businessId: "zazil" }),
      entry("p2", 90, { businessId: "zazil" }),
      entry("p3"),
      entry("p4"),
      entry("p5"),
      entry("p6"),
    ];
    const out = arrangeListing(list, seed);
    expect(out.filter((slot) => slot.labeled)).toHaveLength(1);
  });

  test("sin paquetes el orden orgánico queda intacto y nadie dice Recomendado", () => {
    const list = ["a", "b", "c", "d", "e"].map((id) => entry(id));
    const out = arrangeListing(list, seed);
    expect(out.map((slot) => slot.item)).toEqual(["a", "b", "c", "d", "e"]);
    expect(out.some((slot) => slot.labeled)).toBe(false);
  });

  test("el destacado fijado entra antes que el paquete, sin la etiqueta Recomendado", () => {
    const list = [entry("a", 90), entry("b"), entry("c"), entry("d"), entry("e", 0, { pinned: true })];
    const out = arrangeListing(list, seed);
    expect(out[0]?.item).toBe("e");
    expect(out[0]?.origin).toBe("pinned");
    expect(out[0]?.labeled).toBe(false);
    expect(out[4]?.item).toBe("a");
  });

  test("mismo día, mismo orden; un paquete más alto sale primero más días", () => {
    const list = () => [entry("elite", 90), entry("destacado", 25), entry("x"), entry("y")];
    expect(arrangeListing(list(), seed).map((s) => s.item)).toEqual(
      arrangeListing(list(), seed).map((s) => s.item),
    );
    let eliteFirst = 0;
    for (let day = 1; day <= 60; day += 1) {
      const out = arrangeListing(list(), `2026-10-${day}:listado:hoteles`);
      if (out[0]?.item === "elite") eliteFirst += 1;
    }
    expect(eliteFirst).toBeGreaterThan(30);
    expect(eliteFirst).toBeLessThan(60);
  });

  test("el día se calcula en hora de Valladolid", () => {
    expect(meridaIsoDay(new Date("2026-11-23T05:30:00Z"))).toBe("2026-11-22");
    expect(meridaIsoDay(new Date("2026-11-23T06:30:00Z"))).toBe("2026-11-23");
  });
});
