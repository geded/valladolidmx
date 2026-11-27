import { describe, expect, it } from "vitest";
import {
  DEFAULT_TAXI_FLEET,
  normalizeTaxiFleet,
  taxiClassForPassengers,
  taxiDriversForClass,
  taxiMaxPassengers,
} from "../src/lib/taxi/rules";

describe("Taxi Alux · tipo de vehículo según el grupo", () => {
  it("hasta 4 personas va en compacto", () => {
    expect(taxiClassForPassengers(DEFAULT_TAXI_FLEET, 4)?.key).toBe("compacto");
  });
  it("5 personas ya no caben en compacto: camioneta", () => {
    expect(taxiClassForPassengers(DEFAULT_TAXI_FLEET, 5)?.key).toBe("camioneta");
  });
  it("7 personas pasan a van", () => {
    expect(taxiClassForPassengers(DEFAULT_TAXI_FLEET, 7)?.key).toBe("van");
  });
  it("más personas que la van más grande no tienen vehículo", () => {
    expect(taxiClassForPassengers(DEFAULT_TAXI_FLEET, taxiMaxPassengers(DEFAULT_TAXI_FLEET) + 1)).toBeNull();
  });
  it("una camioneta puede llevar un viaje de compacto, un compacto no lleva uno de camioneta", () => {
    const config = { fleet: DEFAULT_TAXI_FLEET, drivers_by_class: { camioneta: 1 } };
    expect(taxiDriversForClass(config, "compacto")).toBe(1);
    expect(taxiDriversForClass({ ...config, drivers_by_class: { compacto: 2 } }, "camioneta")).toBe(0);
  });
  it("sin configuración usa 3 min de espera gratis y 2 paradas", () => {
    const f = normalizeTaxiFleet(null);
    expect(f.wait_free_minutes).toBe(3);
    expect(f.max_stops).toBe(2);
  });
});
