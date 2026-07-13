/**
 * CV6.5.3 · Traffic Status Evaluator (pure).
 *
 * Convierte una respuesta de ruta (distancia + duración con tráfico +
 * duración base opcional) y — si aplica — un `arriveBy` en un estado
 * normalizado. Sin red, sin DB, sin fetch: 100% determinístico y
 * unit-testable.
 *
 * Estados normalizados (contrato CV6.5.3):
 *   - "on_time"           llega con holgura ≥ ON_TIME_BUFFER_MIN
 *   - "leave_soon"        conviene salir en ≤ SOON_MIN minutos
 *   - "leave_now"         hay que salir ahora (ventana ≤ NOW_MIN)
 *   - "delay_risk"        holgura pequeña o tráfico deteriora el ETA
 *   - "likely_late"       ETA > arriveBy
 *   - "route_unavailable" el proveedor no devolvió ruta
 *   - "traffic_unknown"   timeout / error / datos insuficientes
 *
 * Reglas Auto-Hide (Founder Experience First):
 *   · Si no hay `arriveBy` y la duración es breve (< HIDE_MIN), se
 *     devuelve `traffic_unknown` con `hidden: true` para que el
 *     Decision Center no emita tarjeta.
 */

export type TrafficStatus =
  | "on_time"
  | "leave_soon"
  | "leave_now"
  | "delay_risk"
  | "likely_late"
  | "route_unavailable"
  | "traffic_unknown";

export interface TrafficEvaluateInput {
  /** Duración con tráfico (segundos). */
  durationSeconds: number | null;
  /** Duración base sin tráfico (segundos). Puede coincidir con la anterior. */
  staticDurationSeconds?: number | null;
  /** Distancia (metros). */
  distanceMeters?: number | null;
  /** Hora objetivo de llegada (ISO). Opcional. */
  arriveBy?: string | null;
  /** Timestamp actual. */
  now: Date;
  /** Marca que el proveedor NO devolvió ruta. */
  routeUnavailable?: boolean;
}

export interface TrafficEvaluateResult {
  status: TrafficStatus;
  /** ETA calculado (ISO) si hay duración. */
  etaISO: string | null;
  /** Minutos de holgura respecto a arriveBy (positivo = llega antes). */
  bufferMinutes: number | null;
  /** Minutos hasta la hora recomendada de salida. */
  minutesToLeave: number | null;
  /** Delta con vs sin tráfico (minutos). */
  trafficDeltaMinutes: number | null;
  /** Confianza cualitativa. */
  confidence: "high" | "medium" | "low";
  /** Explicabilidad textual de por qué se emitió este estado. */
  rationale: string;
  /** Si true, el consumidor debería ocultar la señal (Auto-Hide). */
  hidden: boolean;
}

const NOW_MIN = 5;
const SOON_MIN = 30;
const ON_TIME_BUFFER_MIN = 15;
const DELAY_RISK_BUFFER_MIN = 10;
const HIDE_MIN = 8;
const TRAFFIC_DELTA_ALERT_MIN = 8;

export function evaluateTrafficStatus(
  input: TrafficEvaluateInput,
): TrafficEvaluateResult {
  if (input.routeUnavailable) {
    return {
      status: "route_unavailable",
      etaISO: null,
      bufferMinutes: null,
      minutesToLeave: null,
      trafficDeltaMinutes: null,
      confidence: "low",
      rationale: "El proveedor de rutas no devolvió un trayecto viable.",
      hidden: false,
    };
  }

  const dur = input.durationSeconds;
  if (dur == null || !Number.isFinite(dur) || dur < 0) {
    return {
      status: "traffic_unknown",
      etaISO: null,
      bufferMinutes: null,
      minutesToLeave: null,
      trafficDeltaMinutes: null,
      confidence: "low",
      rationale: "Sin datos suficientes de duración para estimar el trayecto.",
      hidden: true,
    };
  }

  const durationMinutes = Math.round(dur / 60);
  const baseSec = input.staticDurationSeconds ?? dur;
  const trafficDelta = Math.round((dur - baseSec) / 60);
  const eta = new Date(input.now.getTime() + dur * 1000);
  const arriveBy = input.arriveBy ? new Date(input.arriveBy) : null;
  const arriveByValid = arriveBy && !Number.isNaN(arriveBy.getTime());

  let confidence: TrafficEvaluateResult["confidence"] = "medium";
  if (baseSec !== dur) confidence = "high";

  // Sin arriveBy: sólo hacemos algo útil si el trayecto es relevante
  // o el tráfico deteriora significativamente el ETA.
  if (!arriveByValid) {
    const hidden = durationMinutes < HIDE_MIN && trafficDelta < TRAFFIC_DELTA_ALERT_MIN;
    return {
      status: hidden ? "traffic_unknown" : "on_time",
      etaISO: eta.toISOString(),
      bufferMinutes: null,
      minutesToLeave: null,
      trafficDeltaMinutes: trafficDelta,
      confidence,
      rationale: hidden
        ? `Trayecto breve (${durationMinutes} min). Sin acción concreta.`
        : `Trayecto ${durationMinutes} min${trafficDelta > 0 ? ` (+${trafficDelta} min por tráfico)` : ""}.`,
      hidden,
    };
  }

  const arriveTs = arriveBy!.getTime();
  const departTs = arriveTs - dur * 1000;
  const minutesToLeave = Math.round((departTs - input.now.getTime()) / 60000);
  const bufferMinutes = Math.round((arriveTs - eta.getTime()) / 60000);

  if (bufferMinutes < 0) {
    return {
      status: "likely_late",
      etaISO: eta.toISOString(),
      bufferMinutes,
      minutesToLeave,
      trafficDeltaMinutes: trafficDelta,
      confidence,
      rationale: `Llegarías ${Math.abs(bufferMinutes)} min tarde saliendo ahora (${durationMinutes} min de trayecto).`,
      hidden: false,
    };
  }

  if (minutesToLeave <= NOW_MIN) {
    return {
      status: "leave_now",
      etaISO: eta.toISOString(),
      bufferMinutes,
      minutesToLeave,
      trafficDeltaMinutes: trafficDelta,
      confidence,
      rationale: `Sal ahora para llegar a tiempo (${durationMinutes} min de trayecto${trafficDelta > 0 ? `, +${trafficDelta} por tráfico` : ""}).`,
      hidden: false,
    };
  }

  if (minutesToLeave <= SOON_MIN) {
    return {
      status: "leave_soon",
      etaISO: eta.toISOString(),
      bufferMinutes,
      minutesToLeave,
      trafficDeltaMinutes: trafficDelta,
      confidence,
      rationale: `Sal en ${minutesToLeave} min (trayecto ${durationMinutes} min).`,
      hidden: false,
    };
  }

  if (
    bufferMinutes < DELAY_RISK_BUFFER_MIN ||
    trafficDelta >= TRAFFIC_DELTA_ALERT_MIN
  ) {
    return {
      status: "delay_risk",
      etaISO: eta.toISOString(),
      bufferMinutes,
      minutesToLeave,
      trafficDeltaMinutes: trafficDelta,
      confidence,
      rationale:
        trafficDelta >= TRAFFIC_DELTA_ALERT_MIN
          ? `El tráfico añade ${trafficDelta} min. Considera ajustar la actividad.`
          : `Sólo ${bufferMinutes} min de holgura. Riesgo de llegar tarde.`,
      hidden: false,
    };
  }

  return {
    status: "on_time",
    etaISO: eta.toISOString(),
    bufferMinutes,
    minutesToLeave,
    trafficDeltaMinutes: trafficDelta,
    confidence,
    rationale:
      bufferMinutes >= ON_TIME_BUFFER_MIN
        ? `Llegarás con ${bufferMinutes} min de holgura.`
        : `Trayecto estable (${durationMinutes} min).`,
    hidden: false,
  };
}
