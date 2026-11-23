import { describe, expect, it } from "vitest";
import {
  STAY_CONFIRM_HOURS,
  STAY_MAX_NIGHTS,
  nightsBetween,
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
