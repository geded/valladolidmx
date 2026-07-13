/**
 * CV6.5.2 · Unit tests para `evaluateHoursStatus`.
 * Ejecutar con: `bun test scripts/hours-status.test.ts`
 *
 * Cubre los 10 casos exigidos por la Autorización CV6.5.2:
 *  1. Empresa abierta.
 *  2. Empresa cerrada.
 *  3. Abre dentro de 60 minutos.
 *  4. Cierra dentro de 60 minutos.
 *  5. Día sin servicio.
 *  6. Horario partido.
 *  7. Horario que cruza medianoche.
 *  8. Entidad sin horarios.
 *  9. Horario inválido o incompleto.
 * 10. Diferencia entre zona horaria del viajero y del destino.
 */
import { describe, expect, test } from "bun:test";
import { evaluateHoursStatus } from "../src/lib/business/hours-status";
import type { BusinessHourRow } from "../src/lib/business/open-now";

const TZ = "America/Merida";

/** `at` en UTC que corresponde a HH:MM local de America/Merida (UTC−6, sin DST). */
function atLocal(day: string, hh: number, mm = 0): Date {
  // America/Merida = UTC-6 fijo. hora local N ⇒ UTC N+6.
  return new Date(`${day}T${String(hh + 6).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
}

// 2026-07-13 es LUNES (dow=1).
const MONDAY = "2026-07-13";

describe("evaluateHoursStatus", () => {
  test("1. abierta ahora", () => {
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "09:00", closes_at: "18:00" },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 12) });
    expect(r.status).toBe("open_now");
    expect(r.closesAt).toBe("18:00");
  });

  test("2. cerrada (fuera de horario, reabre hoy)", () => {
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "09:00", closes_at: "18:00" },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 7) });
    expect(r.status).toBe("closed_now");
    expect(r.opensAt).toBe("09:00");
  });

  test("3. abre dentro de 60 min → opening_soon", () => {
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "09:00", closes_at: "18:00" },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 8, 30) });
    expect(r.status).toBe("opening_soon");
    expect(r.minutesToOpen).toBe(30);
  });

  test("4. cierra dentro de 60 min → closing_soon", () => {
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "09:00", closes_at: "18:00" },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 17, 30) });
    expect(r.status).toBe("closing_soon");
    expect(r.minutesToClose).toBe(30);
  });

  test("5. día sin servicio → closed_today", () => {
    // Sólo abre martes.
    const rows: BusinessHourRow[] = [
      { day_of_week: 2, opens_at: "09:00", closes_at: "18:00" },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 12) });
    expect(r.status).toBe("closed_today");
    expect(r.opensDayLabel).toBe("mañana");
  });

  test("6. horario partido (comida)", () => {
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "09:00", closes_at: "14:00" },
      { day_of_week: 1, opens_at: "17:00", closes_at: "22:00" },
    ];
    const r1 = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 15) });
    expect(r1.status).toBe("closed_now");
    expect(r1.opensAt).toBe("17:00");
    const r2 = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 18) });
    expect(r2.status).toBe("open_now");
    expect(r2.closesAt).toBe("22:00");
  });

  test("7. overnight (bar 20:00→02:00) — abierto pasada la medianoche", () => {
    // domingo 20:00 → lunes 02:00. A las 00:30 quedan 90 min → open_now.
    const rows: BusinessHourRow[] = [
      { day_of_week: 0, opens_at: "20:00", closes_at: "02:00" },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 0, 30) });
    expect(r.status).toBe("open_now");
    expect(r.closesAt).toBe("02:00");
    // A las 01:30 quedan 30 min → closing_soon.
    const r2 = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 1, 30) });
    expect(r2.status).toBe("closing_soon");
  });

  test("8. sin filas → hours_unknown", () => {
    const r = evaluateHoursStatus([], { timezone: TZ, now: atLocal(MONDAY, 12) });
    expect(r.status).toBe("hours_unknown");
  });

  test("9. filas inválidas → hours_unknown", () => {
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "??:??" as unknown as string, closes_at: null },
    ];
    const r = evaluateHoursStatus(rows, { timezone: TZ, now: atLocal(MONDAY, 12) });
    expect(r.status).toBe("hours_unknown");
  });

  test("10. diferencia de timezone viajero vs destino", () => {
    // Instante equivalente a Merida 12:00 lunes. Aunque el reloj del
    // viajero esté en otra TZ, la evaluación usa la TZ del destino.
    const rows: BusinessHourRow[] = [
      { day_of_week: 1, opens_at: "09:00", closes_at: "18:00" },
    ];
    const instant = atLocal(MONDAY, 12); // 12:00 Merida = 18:00 UTC
    const rMerida = evaluateHoursStatus(rows, { timezone: "America/Merida", now: instant });
    const rMadrid = evaluateHoursStatus(rows, { timezone: "Europe/Madrid", now: instant });
    expect(rMerida.status).toBe("open_now");
    // En Madrid ese instante son las 20:00 (verano) → cerrado.
    expect(rMadrid.status).toBe("closed_today");
  });
});