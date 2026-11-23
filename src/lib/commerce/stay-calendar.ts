/**
 * Reservas por noche (hoteles) — reglas puras compartidas por el botón,
 * la confirmación y las pruebas. Las fechas son días locales `YYYY-MM-DD`.
 */

/** Horas que tiene el hotel para confirmar una solicitud. */
export const STAY_CONFIRM_HOURS = 12;
/** Máximo de noches por solicitud en línea. */
export const STAY_MAX_NIGHTS = 30;

export interface StayNight {
  night: string;
  available: number;
}

function toUtcDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(day: string, n: number): string {
  const t = new Date(toUtcDay(day) + n * 86_400_000);
  return t.toISOString().slice(0, 10);
}

/** Noches entre llegada y salida (la noche de salida no cuenta). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toUtcDay(checkOut) - toUtcDay(checkIn)) / 86_400_000);
}

/**
 * Una estancia cabe si todas sus noches (de la llegada a la noche anterior
 * a la salida) tienen al menos una habitación libre. La salida puede caer
 * en una noche ocupada.
 */
export function stayFits(calendar: ReadonlyMap<string, number>, checkIn: string, checkOut: string): boolean {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > STAY_MAX_NIGHTS) return false;
  for (let i = 0; i < nights; i += 1) {
    if ((calendar.get(addDays(checkIn, i)) ?? 0) < 1) return false;
  }
  return true;
}

/** Total en centavos: precio por noche × noches. */
export function stayTotalCents(nightlyCents: number, checkIn: string, checkOut: string): number {
  return Math.max(nightsBetween(checkIn, checkOut), 0) * nightlyCents;
}

export function stayErrorMessage(message: string): string {
  if (message.includes("auth_required")) return "Inicia sesión para solicitar tu reserva.";
  if (message.includes("stay_night_unavailable")) return "Alguna de esas noches ya no está libre. Elige otras fechas.";
  if (message.includes("stay_dates_past")) return "La llegada no puede ser en una fecha pasada.";
  if (message.includes("stay_dates_invalid")) return "La salida debe ser después de la llegada.";
  if (message.includes("stay_too_long")) return `Puedes reservar hasta ${STAY_MAX_NIGHTS} noches en línea.`;
  if (message.includes("stay_guests_invalid")) return "Esa habitación no admite ese número de huéspedes.";
  if (message.includes("online_sales_not_enabled_for_business"))
    return "Este hotel no tiene las reservas en línea activadas.";
  if (message.includes("stay_confirmation_expired")) return "Ya pasaron las 12 horas para confirmar esta solicitud.";
  if (message.includes("stay_already_decided")) return "Esta solicitud ya fue atendida.";
  if (message.includes("stay_pending_host_confirmation")) return "El hotel todavía no confirma esta reserva.";
  if (message.includes("forbidden")) return "No tienes permiso para atender esta solicitud.";
  return "No se pudo completar. Intenta de nuevo.";
}
