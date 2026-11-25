import { describe, expect, it } from "vitest";
import { buildTableReport, clampFloor, floorFromGroups, groupsFromFloor, guestSummary, phoneKey } from "../src/lib/commerce/table-floor";

describe("Reservar mesa · Etapa 2", () => {
  it("el plano inicial respeta las mesas de la Etapa 1 (6 de 4 y 2 de 2)", () => {
    const plan = floorFromGroups([{ seats: 4, count: 6 }, { seats: 2, count: 2 }]);
    expect(plan).toHaveLength(8);
    expect(groupsFromFloor(plan)).toEqual([{ seats: 2, count: 2 }, { seats: 4, count: 6 }]);
  });
  it("una mesa no puede salir del plano", () => {
    expect(clampFloor({ id: "a", label: "M", seats: 4, zone: "Terraza", x: 99, y: -3 })).toMatchObject({ x: 10, y: 0 });
  });
  it("el mismo comensal se reconoce con o sin +52", () => {
    expect(phoneKey("+52 985 123 4567")).toBe(phoneKey("9851234567"));
  });
  it("el reporte cuenta no-shows sobre las reservas que ya pasaron, sin canceladas", () => {
    const r = buildTableReport([
      { starts_at: "2026-11-20T19:00:00Z", party_size: 4, status: "terminada", source: "pagina" },
      { starts_at: "2026-11-20T19:00:00Z", party_size: 2, status: "no_vino", source: "telefono" },
      { starts_at: "2026-11-20T19:00:00Z", party_size: 6, status: "cancelada", source: "pagina" },
    ]);
    expect(r).toMatchObject({ guests: 4, noShows: 1, noShowRate: 50, cancelled: 1, platformGuests: 4 });
  });
  it("la ficha cuenta visitas reales y no-shows", () => {
    const s = guestSummary([
      { starts_at: "2026-10-01T19:00:00Z", party_size: 2, status: "terminada" },
      { starts_at: "2026-10-10T19:00:00Z", party_size: 2, status: "no_vino" },
      { starts_at: "2026-12-10T19:00:00Z", party_size: 2, status: "confirmada" },
    ], new Date("2026-11-25T00:00:00Z"));
    expect(s).toEqual({ visits: 1, noShows: 1, upcoming: 1, lastVisit: "2026-10-01T19:00:00Z" });
  });
});
