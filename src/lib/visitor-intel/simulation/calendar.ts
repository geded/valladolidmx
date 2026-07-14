/**
 * CV8.S.2 · Calendario del escenario (Capa 2: Generación).
 *
 * Founder Scenario Coherence Principle · Regla de Realismo Temporal:
 * distribuye llegadas a lo largo del periodo respetando weekends, temporada
 * y hora del día. Deterministo desde el PRNG.
 */
import type { Prng } from "./prng";
import type { z } from "zod";
import type { CalendarConfigSchema } from "./scenario";

export type CalendarConfig = z.infer<typeof CalendarConfigSchema>;

export interface SessionMoment {
  /** Timestamp ISO 8601 UTC. */
  iso: string;
  /** Timestamp epoch ms. */
  ms: number;
  /** true si cae en sábado/domingo local (Yucatán ~UTC-5, aproximación UTC). */
  is_weekend: boolean;
  /** true si el motor decide "día lluvioso" (sensibilidad por perfil aplica luego). */
  is_rainy: boolean;
}

/** Muestrea un momento de sesión inicial respetando pesos temporales. */
export function sampleSessionMoment(
  cal: CalendarConfig,
  prng: Prng,
): SessionMoment {
  const start = new Date(cal.start_date).getTime();
  const end = new Date(cal.end_date).getTime();
  if (end <= start) throw new Error("calendar: end_date must be > start_date");

  // Reintentos con rechazo por peso (weekend/season). Determinístico.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const raw = start + Math.floor(prng.next() * (end - start));
    const d = new Date(raw);
    const dow = d.getUTCDay(); // 0 dom .. 6 sab
    const isWeekend = dow === 0 || dow === 6;
    const monthKey = String(d.getUTCMonth() + 1).padStart(2, "0");
    const seasonBoost = cal.season_boost[monthKey] ?? 1;
    const dayWeight = (isWeekend ? cal.weekend_boost : 1) * seasonBoost;
    // Normalizamos: aceptamos si prng < weight/maxWeight (aprox 1 * boost).
    const maxWeight = Math.max(cal.weekend_boost, ...Object.values(cal.season_boost), 1);
    if (prng.next() < dayWeight / maxWeight) {
      // Hora del día — distribución bimodal (mañana + tarde).
      const morning = prng.bool(0.55);
      const hour = morning ? prng.int(8, 12) : prng.int(15, 21);
      const minute = prng.int(0, 59);
      d.setUTCHours(hour, minute, prng.int(0, 59), 0);
      const ms = d.getTime();
      return {
        iso: new Date(ms).toISOString(),
        ms,
        is_weekend: isWeekend,
        is_rainy: prng.bool(cal.rainy_day_probability),
      };
    }
  }
  // Fallback determinístico (no debe ocurrir con parámetros razonables).
  const ms = start + Math.floor(prng.next() * (end - start));
  return {
    iso: new Date(ms).toISOString(),
    ms,
    is_weekend: false,
    is_rainy: false,
  };
}

/** Muestrea un gap (ms) uniforme dentro de una ventana. */
export function sampleGap(prng: Prng, minMs: number, maxMs: number): number {
  if (maxMs < minMs) throw new Error("calendar.sampleGap: max < min");
  return minMs + Math.floor(prng.next() * (maxMs - minMs));
}

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;