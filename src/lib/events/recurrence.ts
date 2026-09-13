export type EventRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface EventScheduleTime {
  time: string;
  label?: string | null;
}

export interface EventExceptionDate {
  date: string;
  note?: string | null;
}

export interface EventRecurrenceInput {
  starts_at: string;
  ends_at?: string | null;
  recurrence_frequency?: EventRecurrenceFrequency | null;
  recurrence_interval?: number | null;
  recurrence_weekdays?: number[] | null;
  recurrence_until?: string | null;
  schedule_times?: EventScheduleTime[] | null;
  exception_dates?: EventExceptionDate[] | null;
  event_timezone?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MERIDA_OFFSET = "-06:00";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

function addDays(key: string, amount: number): string {
  const date = utcDate(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function dayDistance(from: string, to: string): number {
  return Math.floor((utcDate(to).getTime() - utcDate(from).getTime()) / 86_400_000);
}

function monthDistance(from: string, to: string): number {
  const a = utcDate(from);
  const b = utcDate(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
}

function localDateInMerida(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Merida",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function localTimeInMerida(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Merida",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function normalizeScheduleTimes(value: unknown): EventScheduleTime[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, EventScheduleTime>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { time?: unknown; label?: unknown };
    const time = typeof raw.time === "string" ? raw.time.trim() : "";
    if (!TIME_RE.test(time)) continue;
    const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 40) : "";
    unique.set(`${time}|${label}`, { time, label: label || null });
  }
  return [...unique.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export function normalizeExceptionDates(value: unknown): EventExceptionDate[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, EventExceptionDate>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { date?: unknown; note?: unknown };
    const date = typeof raw.date === "string" ? raw.date.trim() : "";
    if (!DATE_RE.test(date)) continue;
    const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 100) : "";
    unique.set(date, { date, note: note || null });
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function isOccurrenceDate(input: EventRecurrenceInput, candidate: string, startDate: string): boolean {
  const interval = Math.max(1, Math.floor(input.recurrence_interval ?? 1));
  const distance = dayDistance(startDate, candidate);
  if (distance < 0) return false;
  switch (input.recurrence_frequency) {
    case "daily":
      return distance % interval === 0;
    case "weekly": {
      const weekdays = input.recurrence_weekdays?.length
        ? input.recurrence_weekdays
        : [utcDate(startDate).getUTCDay()];
      return Math.floor(distance / 7) % interval === 0 && weekdays.includes(utcDate(candidate).getUTCDay());
    }
    case "monthly": {
      const months = monthDistance(startDate, candidate);
      return months >= 0 && months % interval === 0 && utcDate(candidate).getUTCDate() === utcDate(startDate).getUTCDate();
    }
    case "yearly": {
      const start = utcDate(startDate);
      const current = utcDate(candidate);
      return (
        (current.getUTCFullYear() - start.getUTCFullYear()) % interval === 0 &&
        current.getUTCMonth() === start.getUTCMonth() &&
        current.getUTCDate() === start.getUTCDate()
      );
    }
    default:
      return false;
  }
}

export function nextEventOccurrence(
  input: EventRecurrenceInput,
  now = new Date(),
): { startsAt: string; endsAt: string | null; date: string } | null {
  const base = new Date(input.starts_at);
  if (Number.isNaN(base.getTime())) return null;
  if (!input.recurrence_frequency) {
    if (base.getTime() < now.getTime()) return null;
    return { startsAt: input.starts_at, endsAt: input.ends_at ?? null, date: input.starts_at.slice(0, 10) };
  }

  const startDate = input.starts_at.slice(0, 10);
  const today = localDateInMerida(now);
  const currentTime = localTimeInMerida(now);
  const until = input.recurrence_until && DATE_RE.test(input.recurrence_until) ? input.recurrence_until : null;
  const excluded = new Set(normalizeExceptionDates(input.exception_dates).map((item) => item.date));
  const fallbackTime = `${String(base.getHours()).padStart(2, "0")}:${String(base.getMinutes()).padStart(2, "0")}`;
  const times = normalizeScheduleTimes(input.schedule_times);
  const schedule = times.length ? times : [{ time: fallbackTime, label: null }];

  for (let offset = 0; offset <= 3660; offset += 1) {
    const candidate = addDays(today, offset);
    if (until && candidate > until) return null;
    if (excluded.has(candidate) || !isOccurrenceDate(input, candidate, startDate)) continue;
    const nextTime = schedule.find((item) => offset > 0 || item.time >= currentTime);
    if (!nextTime) continue;
    const startsAt = `${candidate}T${nextTime.time}:00${MERIDA_OFFSET}`;
    return { startsAt, endsAt: null, date: candidate };
  }
  return null;
}

export function recurrenceLabel(input: EventRecurrenceInput): string | null {
  const every = Math.max(1, Math.floor(input.recurrence_interval ?? 1));
  if (!input.recurrence_frequency) return null;
  const labels: Record<EventRecurrenceFrequency, [string, string]> = {
    daily: ["Todos los días", `Cada ${every} días`],
    weekly: ["Cada semana", `Cada ${every} semanas`],
    monthly: ["Cada mes", `Cada ${every} meses`],
    yearly: ["Cada año", `Cada ${every} años`],
  };
  return labels[input.recurrence_frequency][every === 1 ? 0 : 1];
}

export function scheduleLabel(value: unknown): string | null {
  const times = normalizeScheduleTimes(value);
  if (!times.length) return null;
  return times.map((item) => `${item.time} h${item.label ? ` (${item.label})` : ""}`).join(" y ");
}