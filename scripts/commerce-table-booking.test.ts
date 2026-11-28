import { describe, expect, it } from "vitest";
import {
  DEFAULT_TABLE_SETTINGS,
  nextTableActions,
  normalizeTableSettings,
  platformGuests,
  futureTableSlots,
  tableZoneAvailable,
  activeTableBookingShortcut,
} from "../src/lib/commerce/table-booking";
import {
  businessAllowsOnlineSale,
  normalizeOnlineSalesInput,
} from "../src/lib/commerce/online-sales-rules";

describe("Reservar mesa", () => {
  it("para hoy elimina las horas pasadas y la hora actual de Valladolid", () => {
    const slots = ["14:00", "14:30", "15:00"].map((time) => ({
      slot_time: time,
      starts_at: `2026-11-27T${time}:00-06:00`,
      available: true,
    }));
    expect(
      futureTableSlots(slots, Date.parse("2026-11-27T14:30:00-06:00")).map((s) => s.slot_time),
    ).toEqual(["15:00"]);
  });
  it("para otro día conserva las horas futuras disponibles, no las ocupadas", () => {
    const slots = [true, false].map((available, i) => ({
      slot_time: `08:${i ? "30" : "00"}`,
      starts_at: `2026-11-28T08:${i ? "30" : "00"}:00-06:00`,
      available,
    }));
    expect(
      futureTableSlots(slots, Date.parse("2026-11-27T20:00:00-06:00")).map((s) => s.slot_time),
    ).toEqual(["08:00"]);
  });
  it("solo permite zonas con mesa libre para la hora elegida", () => {
    const slot = {
      slot_time: "15:00",
      starts_at: "2026-11-28T15:00:00-06:00",
      available: true,
      zones: ["Terraza"],
    };
    expect(tableZoneAvailable(slot, "Terraza")).toBe(true);
    expect(tableZoneAvailable(slot, "Adentro")).toBe(false);
    expect(tableZoneAvailable(slot, "")).toBe(true);
  });
  it("el administrador puede activar el modo «mesas»", () => {
    expect(
      normalizeOnlineSalesInput({ enabled: true, modes: ["mesas"], channels: ["pagina"] }).modes,
    ).toEqual(["mesas"]);
  });
  it("activar mesas no abre la venta de productos de restaurante", () => {
    expect(
      businessAllowsOnlineSale(
        { enabled: true, modes: ["mesas"], channels: ["pagina"] },
        "restaurante",
        "pagina",
      ),
    ).toBe(false);
  });
  it("una reservada pasa a llegó, no vino o cancelada", () => {
    expect(nextTableActions("confirmada")).toEqual(["llego", "no_vino", "cancelada"]);
  });
  it("solo cuentan como traídas por la plataforma las personas de página, Alux o WhatsApp que sí llegaron", () => {
    expect(
      platformGuests([
        { source: "pagina", status: "terminada", party_size: 4 },
        { source: "telefono", status: "terminada", party_size: 6 },
        { source: "alux", status: "no_vino", party_size: 2 },
        { source: "whatsapp", status: "sentada", party_size: 3 },
      ]),
    ).toBe(7);
  });
  it("sin mesas no se puede guardar", () => {
    expect(normalizeTableSettings({ ...DEFAULT_TABLE_SETTINGS, tables: [] }).ok).toBe(false);
  });
  it("el máximo de personas no supera la mesa más grande", () => {
    const r = normalizeTableSettings({
      ...DEFAULT_TABLE_SETTINGS,
      max_party: 12,
      tables: [{ seats: 4, count: 3 }],
    });
    expect(r.ok && r.value.max_party).toBe(4);
  });
  it("el Portal sólo muestra el acceso de la empresa seleccionada y activada", () => {
    const shortcuts = [{ businessId: "copalli", today: 3, pending: 1 }];
    expect(activeTableBookingShortcut(shortcuts, "copalli")).toEqual(shortcuts[0]);
    expect(activeTableBookingShortcut(shortcuts, "zazil-tunich")).toBeUndefined();
    expect(activeTableBookingShortcut(shortcuts, null)).toBeUndefined();
  });
});
