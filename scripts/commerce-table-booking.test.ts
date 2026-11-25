import { describe, expect, it } from "vitest";
import {
  DEFAULT_TABLE_SETTINGS,
  nextTableActions,
  normalizeTableSettings,
  platformGuests,
} from "../src/lib/commerce/table-booking";
import { businessAllowsOnlineSale, normalizeOnlineSalesInput } from "../src/lib/commerce/online-sales-rules";

describe("Reservar mesa", () => {
  it("el administrador puede activar el modo «mesas»", () => {
    expect(normalizeOnlineSalesInput({ enabled: true, modes: ["mesas"], channels: ["pagina"] }).modes).toEqual(["mesas"]);
  });
  it("activar mesas no abre la venta de productos de restaurante", () => {
    expect(businessAllowsOnlineSale({ enabled: true, modes: ["mesas"], channels: ["pagina"] }, "restaurante", "pagina")).toBe(false);
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
    const r = normalizeTableSettings({ ...DEFAULT_TABLE_SETTINGS, max_party: 12, tables: [{ seats: 4, count: 3 }] });
    expect(r.ok && r.value.max_party).toBe(4);
  });
});
