import { describe, expect, it } from "vitest";
import {
  STAY_CONFIRM_HOURS,
  STAY_MAX_NIGHTS,
  nightsBetween,
  parsePesosToCents,
  shortPrice,
  stayTotalFromPrices,
  stayFits,
  stayTotalCents,
} from "../src/lib/commerce/stay-calendar";

const calendar = new Map([
  ["2026-12-01", 1],
  ["2026-12-02", 1],
  ["2026-12-03", 0],
  ["2026-12-04", 1],
]);

describe("reservas por noche", () => {
  it("cuenta noches sin incluir el día de salida", () => {
    expect(nightsBetween("2026-12-01", "2026-12-03")).toBe(2);
    expect(nightsBetween("2026-12-31", "2027-01-02")).toBe(2);
  });

  it("permite salir el día de una noche ocupada", () => {
    expect(stayFits(calendar, "2026-12-01", "2026-12-03")).toBe(true);
  });

  it("rechaza una estancia que cruza una noche sin habitación libre", () => {
    expect(stayFits(calendar, "2026-12-02", "2026-12-04")).toBe(false);
  });

  it("rechaza más de 30 noches", () => {
    expect(STAY_MAX_NIGHTS).toBe(30);
    expect(stayFits(new Map(), "2026-12-01", "2027-01-01")).toBe(false);
  });

  it("cobra precio por noche por número de noches (Colonial $1,850 × 2 = $3,700)", () => {
    expect(stayTotalCents(185_000, "2026-12-01", "2026-12-03")).toBe(370_000);
  });

  it("el hotel tiene 12 horas para confirmar", () => {
    expect(STAY_CONFIRM_HOURS).toBe(12);
  });
});

describe("precio por noche en el calendario", () => {
  it("suma el precio de cada noche y usa el precio base donde no hay precio especial", () => {
    const prices = new Map<string, number | null>([
      ["2026-12-24", 250_000],
      ["2026-12-25", 300_000],
    ]);
    // 23 (base $1,850) + 24 ($2,500) + 25 ($3,000) = $7,350
    expect(stayTotalFromPrices(prices, 185_000, "2026-12-23", "2026-12-26")).toBe(735_000);
  });

  it("muestra el precio corto dentro del día", () => {
    expect(shortPrice(185_000)).toBe("$1,850");
    expect(shortPrice(1_250_000)).toBe("$12.5k");
  });

  it("entiende el precio que escribe el hotel", () => {
    expect(parsePesosToCents("1,950")).toBe(195_000);
    expect(parsePesosToCents("$2500.50")).toBe(250_050);
    expect(parsePesosToCents("0")).toBeNull();
    expect(parsePesosToCents("abc")).toBeNull();
  });
});
