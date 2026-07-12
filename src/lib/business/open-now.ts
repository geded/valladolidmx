/**
 * open-now — Compute "abierto ahora" state for a business given its
 * weekly hours in the Oriente Maya timezone (America/Merida, UTC−6, sin DST).
 *
 * Shared helper: usado por el Concierge (A7) y disponible para cards,
 * inspector y superficies futuras. Contrato estable, JSON-serializable.
 *
 * Reglas:
 *  · `day_of_week`: 0=Domingo … 6=Sábado (convención de `business_hours`).
 *  · `opens_at`/`closes_at`: 'HH:MM' o 'HH:MM:SS' en hora LOCAL del destino.
 *  · `is_closed=true` invalida esa franja.
 *  · Overnight (closes_at ≤ opens_at) se trata como cruce de medianoche.
 *  · Si no hay filas, devolvemos "unknown" — nunca inventamos horarios.
 */

export interface BusinessHourRow {
  readonly day_of_week: number;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly is_closed?: boolean | null;
}

export type OpenNowState = "open" | "closed" | "unknown";

export interface OpenNowResult {
  readonly state: OpenNowState;
  /** Etiqueta corta para UI: "Abierto · cierra 22:00" · "Cerrado · abre lun 09:00" · "Horario sin publicar". */
  readonly label: string;
  /** HH:MM local en que cierra (si state=open). */
  readonly closesAt?: string;
  /** HH:MM local en que abre a continuación (si state=closed). */
  readonly opensAt?: string;
  /** Etiqueta corta del día de próxima apertura (si state=closed): "hoy" · "mañana" · "lun". */
  readonly opensDayLabel?: string;
}

const WEEKDAY_LABEL_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Parse 'HH:MM' | 'HH:MM:SS' → minutos desde 00:00. Devuelve null si inválido. */
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

function formatMinutes(total: number): string {
  const n = ((total % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;
}

/**
 * "Now" en la timezone dada como { dow (0..6), minutes (0..1439) }.
 * Usa Intl.DateTimeFormat con hourCycle h23 y weekday numérico via en-US.
 */
function nowInTz(
  now: Date,
  tz: string,
): { dow: number; minutes: number } {
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
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[wk] ?? 0;
  const h = Number(hStr) === 24 ? 0 : Number(hStr); // hourCycle h23 nunca da 24, pero por seguridad
  const m = Number(mStr);
  return { dow, minutes: h * 60 + m };
}

export function computeOpenNow(
  rows: readonly BusinessHourRow[] | null | undefined,
  options?: { readonly timezone?: string; readonly now?: Date },
): OpenNowResult {
  const tz = options?.timezone ?? "America/Merida";
  const now = options?.now ?? new Date();

  if (!rows || rows.length === 0) {
    return { state: "unknown", label: "Horario sin publicar" };
  }

  const { dow, minutes } = nowInTz(now, tz);

  // Franjas efectivas del día actual (excluye is_closed).
  type Slot = { start: number; end: number; overnight: boolean };
  function slotsForDay(d: number): Slot[] {
    const out: Slot[] = [];
    for (const r of rows) {
      if (r.day_of_week !== d) continue;
      if (r.is_closed) continue;
      const s = toMinutes(r.opens_at);
      const e = toMinutes(r.closes_at);
      if (s == null || e == null) continue;
      // Overnight: cierra al día siguiente. Ej: 20:00 → 02:00.
      const overnight = e <= s;
      out.push({ start: s, end: overnight ? e + 1440 : e, overnight });
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // 1) ¿Abierto AHORA por una franja de hoy?
  const todaySlots = slotsForDay(dow);
  for (const slot of todaySlots) {
    if (minutes >= slot.start && minutes < slot.end) {
      const closesAt = formatMinutes(slot.end);
      return {
        state: "open",
        label: `Abierto · cierra ${closesAt}`,
        closesAt,
      };
    }
  }

  // 2) ¿Abierto por una franja overnight de AYER?
  const yesterday = (dow + 6) % 7;
  const ySlots = slotsForDay(yesterday);
  for (const slot of ySlots) {
    if (!slot.overnight) continue;
    const carryEnd = slot.end - 1440; // minutos de hoy en que aún está abierto
    if (minutes < carryEnd) {
      const closesAt = formatMinutes(carryEnd);
      return {
        state: "open",
        label: `Abierto · cierra ${closesAt}`,
        closesAt,
      };
    }
  }

  // 3) Cerrado — buscar próxima apertura en los próximos 7 días.
  for (let offset = 0; offset < 7; offset++) {
    const d = (dow + offset) % 7;
    const slots = slotsForDay(d);
    for (const slot of slots) {
      if (offset === 0 && slot.start <= minutes) continue;
      const opensAt = formatMinutes(slot.start);
      const opensDayLabel =
        offset === 0 ? "hoy" : offset === 1 ? "mañana" : WEEKDAY_LABEL_ES[d];
      return {
        state: "closed",
        label: `Cerrado · abre ${opensDayLabel} ${opensAt}`,
        opensAt,
        opensDayLabel,
      };
    }
  }

  // Todas las filas marcadas como is_closed / inválidas.
  return { state: "closed", label: "Cerrado" };
}