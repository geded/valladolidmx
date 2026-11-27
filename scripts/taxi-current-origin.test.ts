import { describe, expect, it } from "vitest";
import { taxiHasRoute, taxiWithCurrentOrigin } from "../src/lib/taxi/rules";

describe("Taxi desde el lugar elegido", () => {
  it("usa la ubicación actual del viajero aunque hubiera otra recogida guardada", () => {
    const next = taxiWithCurrentOrigin({ origin: { lat: 20.68, lng: -88.21 }, originLabel: "Hotel anterior" }, { lat: 20.689, lng: -88.202 });
    expect(next.origin).toEqual({ lat: 20.689, lng: -88.202 });
    expect(next.originLabel).toBe("Mi ubicación actual");
  });
  it("mantiene como destino Copalli al recibir el GPS del viajero", () => {
    const destination = { lat: 20.674, lng: -88.215 };
    const next = taxiWithCurrentOrigin({ origin: { lat: 20.68, lng: -88.21 }, originLabel: "", destination, destinationLabel: "Copalli Café" }, { lat: 20.689, lng: -88.202 });
    expect(next.destination).toEqual(destination);
    expect(next.destinationLabel).toBe("Copalli Café");
  });
  it("no cotiza desde el centro predeterminado mientras falta la ubicación", () => {
    expect(taxiHasRoute("", "Copalli Café")).toBe(false);
    expect(taxiHasRoute("Mi ubicación actual", "Copalli Café")).toBe(true);
  });
});