/**
 * Avance del viaje — modelo puro. Resume qué paradas ya se vivieron, en qué
 * día va el viajero y cuál es la siguiente parada pendiente.
 */
export interface ProgressItemInput {
  id: string;
  item_kind: string;
  position: number;
  day_index: number | null;
  starts_at_local?: string | null;
}

export interface DayProgress {
  dayIndex: number | null;
  total: number;
  done: number;
}

export interface TripProgress {
  total: number;
  done: number;
  percent: number;
  /** Día de hoy dentro del viaje (0-based) o null si no estamos en fechas. */
  todayIndex: number | null;
  totalDays: number;
  nextItemId: string | null;
  nextDayIndex: number | null;
  days: DayProgress[];
  unscheduled: number;
}

function daysBetween(startIso: string, todayIso: string): number {
  const a = Date.parse(`${startIso}T00:00:00Z`);
  const b = Date.parse(`${todayIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function computeTripProgress(
  items: ProgressItemInput[],
  done: ReadonlySet<string>,
  opts: { startDate: string | null; endDate: string | null; today: string },
): TripProgress {
  const stops = items
    .filter((i) => i.item_kind !== "note")
    .sort((a, b) => {
      const da = a.day_index ?? 9999;
      const db = b.day_index ?? 9999;
      if (da !== db) return da - db;
      const ta = a.starts_at_local ?? "";
      const tb = b.starts_at_local ?? "";
      if (ta && tb && ta !== tb) return ta < tb ? -1 : 1;
      return a.position - b.position;
    });
  const doneCount = stops.filter((s) => done.has(s.id)).length;
  const byDay = new Map<number | null, DayProgress>();
  let maxDay = 0;
  for (const s of stops) {
    const k = s.day_index;
    if (typeof k === "number") maxDay = Math.max(maxDay, k + 1);
    const d = byDay.get(k) ?? { dayIndex: k, total: 0, done: 0 };
    d.total += 1;
    if (done.has(s.id)) d.done += 1;
    byDay.set(k, d);
  }
  let totalDays = maxDay;
  if (opts.startDate && opts.endDate) {
    totalDays = Math.max(totalDays, daysBetween(opts.startDate, opts.endDate) + 1);
  }
  let todayIndex: number | null = null;
  if (opts.startDate) {
    const d = daysBetween(opts.startDate, opts.today);
    if (d >= 0 && d < Math.max(totalDays, 1)) todayIndex = d;
  }
  const days = [...byDay.values()]
    .filter((d) => d.dayIndex !== null)
    .sort((a, b) => (a.dayIndex as number) - (b.dayIndex as number));
  // Siguiente: primero lo pendiente de hoy, si no lo primero pendiente.
  const pending = stops.filter((s) => !done.has(s.id));
  const next =
    (todayIndex !== null ? pending.find((s) => s.day_index === todayIndex) : undefined) ??
    pending.find((s) => s.day_index !== null) ??
    pending[0] ??
    null;
  return {
    total: stops.length,
    done: doneCount,
    percent: stops.length ? Math.round((doneCount / stops.length) * 100) : 0,
    todayIndex,
    totalDays,
    nextItemId: next?.id ?? null,
    nextDayIndex: next?.day_index ?? null,
    days,
    unscheduled: byDay.get(null)?.total ?? 0,
  };
}
