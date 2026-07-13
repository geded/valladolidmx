/**
 * CV6.5.2 · Hours Status Evaluator (pure).
 *
 * Evalúa el estado horario de un negocio a partir de sus filas
 * `business_hours` en la zona horaria LOCAL del destino. Es puro,
 * determinístico y unit-testable — no toca red ni DB.
 *
 * Estados normalizados (contrato oficial CV6.5.2):
 *   - "open_now"
 *   - "closing_soon"   (abierto y cierra dentro de `soonMinutes`)
 *   - "closed_now"     (cerrado y reabre HOY después de `soonMinutes`)
 *   - "opening_soon"   (cerrado y reabre HOY dentro de `soonMinutes`)
 *   - "closed_today"   (cerrado y NO reabre hoy)
 *   - "hours_unknown"  (no hay filas, todas inválidas, o datos faltantes)
 *
 * Timezone: por defecto `America/Merida` (Oriente Maya, UTC−6 sin DST).
 *
 * Reglas:
 *   · `day_of_week`: 0=Domingo … 6=Sábado.
 *   · `opens_at`/`closes_at`: 'HH:MM' o 'HH:MM:SS' en HORA LOCAL del destino.
 *   · `is_closed=true` invalida esa franja.
 *   · Overnight (closes_at ≤ opens_at): cruza medianoche al día siguiente.
 *   · Horarios partidos: filas múltiples por día son válidas.
 */

import type { BusinessHourRow } from "./open-now";

export type HoursStatus =
  | "open_now"
  | "closing_soon"
  | "closed_now"
  | "opening_soon"
  | "closed_today"
  | "hours_unknown";

export interface HoursStatusResult {
  status: HoursStatus;
  /** HH:MM local (destino) en que cierra si está abierto. */
  closesAt?: string;
  /** HH:MM local (destino) en que reabre si está cerrado. */
  opensAt?: string;
  /** "hoy" | "mañana" | "lun" | ... para próxima apertura. */
  opensDayLabel?: string;
  /** Minutos hasta el próximo cierre (si abierto). */
  minutesToClose?: number;
  /** Minutos hasta la próxima apertura (si cerrado). */
  minutesToOpen?: number;
  /** Horario que se evaluó (franjas activas del día). */
  evaluatedSlots: Array<{ opens: string; closes: string }>;
  /** Zona horaria usada. */
  timezone: string;
  /** Timestamp de evaluación (ISO). */
  evaluatedAt: string;
}

const WEEKDAY_LABEL_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function fmt(total: number): string {
  const n = ((total % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;
}

function nowInTz(now: Date, tz: string): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const wk = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hStr = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mStr = parts.find((p) => p.type === "minute")?.value ?? "00";
  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = dowMap[wk] ?? 0;
  const h = Number(hStr) === 24 ? 0 : Number(hStr);
  const m = Number(mStr);
  return { dow, minutes: h * 60 + m };
}

type Slot = { start: number; end: number; overnight: boolean };

function slotsForDay(rows: readonly BusinessHourRow[], d: number): Slot[] {
  const out: Slot[] = [];
  for (const r of rows) {
    if (r.day_of_week !== d) continue;
    if (r.is_closed) continue;
    const s = toMinutes(r.opens_at);
    const e = toMinutes(r.closes_at);
    if (s == null || e == null) continue;
    const overnight = e <= s;
    out.push({ start: s, end: overnight ? e + 1440 : e, overnight });
  }
  return out.sort((a, b) => a.start - b.start);
}

export function evaluateHoursStatus(
  rows: readonly BusinessHourRow[] | null | undefined,
  options?: {
    timezone?: string;
    now?: Date;
    /** Umbral para "closing_soon" / "opening_soon" (default 60 min). */
    soonMinutes?: number;
  },
): HoursStatusResult {
  const tz = options?.timezone ?? "America/Merida";
  const now = options?.now ?? new Date();
  const soon = options?.soonMinutes ?? 60;
  const evaluatedAt = now.toISOString();

  const base = {
    evaluatedSlots: [] as Array<{ opens: string; closes: string }>,
    timezone: tz,
    evaluatedAt,
  };

  if (!rows || rows.length === 0) {
    return { status: "hours_unknown", ...base };
  }

  // Validez: al menos una fila con horario parseable O explícitamente cerrada.
  const anyValid = rows.some((r) => {
    if (r.is_closed) return true;
    return toMinutes(r.opens_at) != null && toMinutes(r.closes_at) != null;
  });
  if (!anyValid) return { status: "hours_unknown", ...base };

  const { dow, minutes } = nowInTz(now, tz);
  const todaySlots = slotsForDay(rows, dow);
  const evaluatedSlots = todaySlots.map((s) => ({
    opens: fmt(s.start),
    closes: fmt(s.end),
  }));

  // 1) Abierto AHORA por franja de hoy.
  for (const slot of todaySlots) {
    if (minutes >= slot.start && minutes < slot.end) {
      const minutesToClose = slot.end - minutes;
      const closesAt = fmt(slot.end);
      const status: HoursStatus =
        minutesToClose <= soon ? "closing_soon" : "open_now";
      return {
        status,
        closesAt,
        minutesToClose,
        evaluatedSlots,
        timezone: tz,
        evaluatedAt,
      };
    }
  }

  // 2) Abierto por overnight de ayer.
  const yesterday = (dow + 6) % 7;
  const ySlots = slotsForDay(rows, yesterday);
  for (const slot of ySlots) {
    if (!slot.overnight) continue;
    const carryEnd = slot.end - 1440;
    if (minutes < carryEnd) {
      const minutesToClose = carryEnd - minutes;
      const closesAt = fmt(carryEnd);
      const status: HoursStatus =
        minutesToClose <= soon ? "closing_soon" : "open_now";
      return {
        status,
        closesAt,
        minutesToClose,
        evaluatedSlots,
        timezone: tz,
        evaluatedAt,
      };
    }
  }

  // 3) Cerrado — buscar próxima apertura en 7 días.
  for (let offset = 0; offset < 7; offset++) {
    const d = (dow + offset) % 7;
    const slots = slotsForDay(rows, d);
    for (const slot of slots) {
      if (offset === 0 && slot.start <= minutes) continue;
      const opensAt = fmt(slot.start);
      const opensDayLabel =
        offset === 0 ? "hoy" : offset === 1 ? "mañana" : WEEKDAY_LABEL_ES[d];
      const minutesToOpen =
        offset === 0
          ? slot.start - minutes
          : offset * 1440 - minutes + slot.start;
      let status: HoursStatus;
      if (offset === 0) {
        status = minutesToOpen <= soon ? "opening_soon" : "closed_now";
      } else {
        status = "closed_today";
      }
      return {
        status,
        opensAt,
        opensDayLabel,
        minutesToOpen,
        evaluatedSlots,
        timezone: tz,
        evaluatedAt,
      };
    }
  }

  // No hay aperturas futuras — todas las filas is_closed o inválidas.
  return { status: "closed_today", evaluatedSlots, timezone: tz, evaluatedAt };
}