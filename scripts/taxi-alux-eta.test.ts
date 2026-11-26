import { describe, expect, it } from "bun:test";
import { taxiEtaHeadline, taxiEtaMinutes } from "../src/lib/taxi/rules";

describe("Taxi Alux · tiempo de llegada", () => {
  it("sin ubicación del taxi no inventa minutos", () => {
    expect(taxiEtaMinutes(null, { lat: 20.69, lng: -88.2 })).toBeNull();
  });
  it("mismo punto cuenta como 1 minuto mínimo", () => {
    expect(taxiEtaMinutes({ lat: 20.69, lng: -88.2 }, { lat: 20.69, lng: -88.2 })).toBe(1);
  });
  it("unos 3 km en línea recta son cerca de 8 minutos", () => {
    const eta = taxiEtaMinutes({ lat: 20.69, lng: -88.2 }, { lat: 20.717, lng: -88.2 });
    expect(eta).toBe(8);
  });
  it("aceptado muestra cuánto falta para que llegue", () => {
    expect(taxiEtaHeadline("accepted", 4)).toBe("Tu taxi llega en 4 min");
    expect(taxiEtaHeadline("arrived", null)).toBe("Tu taxi ya llegó");
  });
});
