import { describe, expect, it } from "vitest";
import { cashierTableState, cashierTables, isValidCashierPin, type CashierReservation } from "@/lib/commerce/cashier";

const now = new Date("2026-11-25T20:00:00Z");
const base: CashierReservation = { id: "r1", table_id: "m1", party_size: 2, status: "sentada",
  starts_at: "2026-11-25T19:30:00Z", ends_at: "2026-11-25T21:00:00Z", source: "sin_cita", guest: "Ana" };
const t = { id: "m1", label: "Mesa 1", seats: 4, zone: "Salón" };

describe("pantalla de caja", () => {
  it("mesa con cliente sentado es ocupada", () => expect(cashierTableState(t, [base], now).kind).toBe("ocupada"));
  it("al pasar la duración la mesa se libera sola", () =>
    expect(cashierTableState(t, [{ ...base, ends_at: "2026-11-25T19:59:00Z" }], now).kind).toBe("libre"));
  it("reserva dentro de 45 min aparta la mesa", () =>
    expect(cashierTableState(t, [{ ...base, status: "confirmada", starts_at: "2026-11-25T20:40:00Z", ends_at: "2026-11-25T22:10:00Z" }], now).kind).toBe("reservada"));
  it("reserva a más de 45 min deja la mesa libre", () =>
    expect(cashierTableState(t, [{ ...base, status: "confirmada", starts_at: "2026-11-25T21:00:00Z", ends_at: "2026-11-25T22:30:00Z" }], now).kind).toBe("libre"));
  it("sin plano numera mesas desde los grupos", () =>
    expect(cashierTables([], [{ seats: 4, count: 2 }, { seats: 2, count: 1 }]).map((x) => x.label)).toEqual(["Mesa 1", "Mesa 2", "Mesa 3"]));
  it("PIN de 4 a 6 dígitos", () => {
    expect(isValidCashierPin("1234")).toBe(true);
    expect(isValidCashierPin("12a4")).toBe(false);
    expect(isValidCashierPin("123")).toBe(false);
  });
});
