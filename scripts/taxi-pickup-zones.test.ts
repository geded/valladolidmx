import { describe, expect, test } from "bun:test";
import { taxiPickupZoneFor } from "../src/lib/taxi/rules";

const zones = [{ slug: "valladolid", name: "Valladolid", lat: 20.6896, lng: -88.2017, radius_km: 30 }];

describe("destinos de salida de Taxi Alux", () => {
  test("en Valladolid sí se puede pedir taxi", () => {
    expect(taxiPickupZoneFor(zones, { lat: 20.69, lng: -88.2 })?.slug).toBe("valladolid");
  });
  test("en El Cuyo todavía no", () => {
    expect(taxiPickupZoneFor(zones, { lat: 21.517, lng: -87.68 })).toBeNull();
  });
  test("en Mérida todavía no", () => {
    expect(taxiPickupZoneFor(zones, { lat: 20.97, lng: -89.62 })).toBeNull();
  });
});
