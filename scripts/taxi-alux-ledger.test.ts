import { describe, expect, it } from "bun:test";
import { buildTaxiLedger, buildTaxiStats, driverDaySummary, taxiLedgerCsv, type TaxiRide } from "../src/lib/taxi/rules";

const base = { traveler_id: "t", origin_label: "A", origin_lat: 0, origin_lng: 0, destination_label: "B", destination_lat: 0, destination_lng: 0, estimated_minutes: 10, currency: "MXN", passengers: 1, requested_for: "2026-11-20T10:00:00Z", payment_method: "cash", traveler_name: "Ana", traveler_phone: "999", notes: null, accepted_at: null, arrived_at: null, started_at: null, cancelled_at: null, cancel_reason: null, created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T11:00:00Z" } as const;
const ride = (o: Partial<TaxiRide>): TaxiRide => ({ ...base, id: "r", folio: "TAXI-1", driver_id: "d1", status: "completed", distance_km: 5, fare_amount: 12500, cash_paid: true, completed_at: "2026-11-20T11:00:00Z", ...o }) as TaxiRide;
const drivers = [{ id: "d1", display_name: "Juan", plates: "YUC-1", vehicle_number: "12" }];

describe("Taxi Alux · bitácora de pagos", () => {
  it("solo registra viajes terminados con efectivo cobrado", () => {
    const l = buildTaxiLedger([ride({}), ride({ id: "x", status: "cancelled", cash_paid: false }), ride({ id: "y", status: "in_progress", cash_paid: false })], drivers);
    expect(l.length).toBe(1);
    expect(l[0]?.method).toBe("Efectivo al conductor");
  });
  it("suma efectivo y tasa de atención", () => {
    const s = buildTaxiStats([ride({}), ride({ id: "2", fare_amount: 7500 }), ride({ id: "3", status: "cancelled", cash_paid: false })], drivers);
    expect(s.cashTotal).toBe(20000);
    expect(s.completionRate).toBe(67);
    expect(s.byDriver[0]?.rides).toBe(2);
  });
  it("exporta el importe en pesos", () => {
    expect(taxiLedgerCsv(buildTaxiLedger([ride({})], drivers))).toContain('"125.00"');
  });
  it("neutraliza fórmulas del viajero, teléfonos y rutas al exportar", () => {
    for (const value of ['=1+1', '+123', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1', '\r=1+1', '\n=1+1']) {
      const csv = taxiLedgerCsv(buildTaxiLedger([ride({ traveler_name: value, traveler_phone: value, origin_label: value })], drivers));
      expect(csv).toContain(`"'${value}"`);
      expect(csv).toContain(`"'${value} → B"`);
    }
  });
  it("corte del día del conductor", () => {
    const day = new Date("2026-11-20T11:00:00Z");
    const key = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    expect(driverDaySummary([ride({})], key)).toEqual({ rides: 1, cash: 12500 });
  });
});
