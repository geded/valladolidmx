/**
 * CV6.5.3 · Unit tests para `evaluateTrafficStatus`.
 * Ejecutar con: `bun test scripts/traffic-status.test.ts`
 *
 * Cubre los 12 casos exigidos por la Autorización CV6.5.3.
 */
import { describe, expect, test } from "bun:test";
import { evaluateTrafficStatus } from "../src/lib/traveler/traffic-status";

const NOW = new Date("2026-07-13T15:00:00Z");
const addMin = (min: number) =>
  new Date(NOW.getTime() + min * 60000).toISOString();

describe("evaluateTrafficStatus (CV6.5.3)", () => {
  test("1 · viaje con tráfico normal y arriveBy holgado → on_time", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 15 * 60,
      staticDurationSeconds: 14 * 60,
      arriveBy: addMin(45),
      now: NOW,
    });
    expect(r.status).toBe("on_time");
    expect(r.hidden).toBe(false);
  });

  test("2 · salida recomendada dentro de 30 min → leave_soon", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 20 * 60,
      arriveBy: addMin(40),
      now: NOW,
    });
    expect(r.status).toBe("leave_soon");
    expect(r.minutesToLeave).toBe(20);
  });

  test("3 · salida inmediata → leave_now", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 25 * 60,
      arriveBy: addMin(28),
      now: NOW,
    });
    expect(r.status).toBe("leave_now");
  });

  test("4 · riesgo de retraso por holgura mínima → delay_risk", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 55 * 60,
      staticDurationSeconds: 50 * 60,
      arriveBy: addMin(60),
      now: NOW,
    });
    expect(r.status).toBe("delay_risk");
    expect(r.bufferMinutes).toBe(5);
  });

  test("5 · llegada probablemente tarde → likely_late", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 40 * 60,
      arriveBy: addMin(30),
      now: NOW,
    });
    expect(r.status).toBe("likely_late");
    expect((r.bufferMinutes ?? 0) < 0).toBe(true);
  });

  test("6 · ruta no disponible → route_unavailable", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: null,
      now: NOW,
      routeUnavailable: true,
    });
    expect(r.status).toBe("route_unavailable");
  });

  test("7 · geolocalización denegada (sin datos de duración) → traffic_unknown hidden", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: null,
      now: NOW,
    });
    expect(r.status).toBe("traffic_unknown");
    expect(r.hidden).toBe(true);
  });

  test("8 · fallback desde hotel — sin arriveBy y trayecto largo → on_time visible", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 25 * 60,
      now: NOW,
    });
    expect(r.status).toBe("on_time");
    expect(r.hidden).toBe(false);
  });

  test("9 · modo caminando corto sin arriveBy → hidden (Auto-Hide)", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 4 * 60,
      now: NOW,
    });
    expect(r.hidden).toBe(true);
  });

  test("10 · delta relevante base vs tráfico sin arriveBy → alerta visible", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 18 * 60,
      staticDurationSeconds: 9 * 60,
      now: NOW,
    });
    expect(r.trafficDeltaMinutes).toBe(9);
    expect(r.hidden).toBe(false);
    expect(r.status).toBe("on_time");
  });

  test("11 · timeout / error del proveedor → route_unavailable", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: null,
      now: NOW,
      routeUnavailable: true,
    });
    expect(r.status).toBe("route_unavailable");
    expect(r.hidden).toBe(false);
  });

  test("12 · arriveBy inválido degrada a rama sin destino temporal", () => {
    const r = evaluateTrafficStatus({
      durationSeconds: 12 * 60,
      arriveBy: "not-a-date",
      now: NOW,
    });
    expect(["on_time", "traffic_unknown"]).toContain(r.status);
  });
});