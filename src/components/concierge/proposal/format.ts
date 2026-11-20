/**
 * Estudio de Propuesta · formateo de moneda, fechas y horas.
 * Hora y fecha SIEMPRE del destino (America/Merida).
 */
import { MERIDA_LOCALE, meridaDayMonth } from "@/lib/time/merida";

export const PROPOSAL_CURRENCY = "MXN";

export function formatMoneyCents(cents: number | null | undefined, currency = PROPOSAL_CURRENCY) {
  if (cents == null || Number.isNaN(cents)) return "—";
  return (cents / 100).toLocaleString(MERIDA_LOCALE, { style: "currency", currency });
}

/** Convierte texto capturado ("1,250.50", "$1250") a centavos. */
export function parseAmountToCents(raw: string): number | null {
  const clean = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!clean.trim()) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Normaliza una hora capturada a HH:MM, o null. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function formatTimeLabel(value: string | null | undefined): string | null {
  const t = normalizeTime(value);
  return t ? `${t} h` : null;
}

export function formatDurationLabel(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Etiqueta del día del viaje: "Día 1 · 14 sep" cuando hay fecha de inicio. */
export function dayLabel(dayIndex: number, startDate?: string | null): string {
  const base = `Día ${dayIndex + 1}`;
  if (!startDate) return base;
  const d = new Date(`${startDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return base;
  d.setUTCDate(d.getUTCDate() + dayIndex);
  const label = meridaDayMonth(d.toISOString());
  return label ? `${base} · ${label}` : base;
}

/** Número de días del viaje (mínimo 1) a partir de las fechas del plan. */
export function tripDayCount(start?: string | null, end?: string | null): number {
  if (!start) return 5;
  const from = new Date(`${start}T12:00:00Z`).getTime();
  const to = end ? new Date(`${end}T12:00:00Z`).getTime() : from;
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 5;
  return Math.min(30, Math.max(1, Math.round((to - from) / 86_400_000) + 1));
}
