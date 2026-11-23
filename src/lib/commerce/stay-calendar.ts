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
  /** Precio de esa noche (precio especial o el precio base de la habitación). */
  priceCents: number | null;
}

/**
 * Día visto por el equipo en el calendario de precios (hoteles, experiencias,
 * tours y todo lo que se reserva por fecha).
 */
export interface CalendarManageDay {
  day: string;
  priceCents: number | null;
  customPrice: boolean;
  blocked: boolean;
  businessClosed: boolean;
  /** Hoteles: habitaciones de ese tipo y cuántas ya están apartadas. */
  rooms: number;
  taken: number;
  /** Experiencias y salidas: horarios de ese día y lugares libres. */
  departures: number;
  seatsLeft: number;
}

/** Hoteles se venden por noche; experiencias y tours por día con horarios. */
export type CalendarKind = "noches" | "dias";

export type CalendarDayAction = "price" | "base_price" | "block" | "unblock";

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

/**
 * Total con precio por día: suma el precio de cada noche de la estancia;
 * una noche sin precio propio usa el precio base.
 */
export function stayTotalFromPrices(
  prices: ReadonlyMap<string, number | null>,
  baseCents: number,
  checkIn: string,
  checkOut: string,
): number {
  const nights = Math.max(nightsBetween(checkIn, checkOut), 0);
  let total = 0;
  for (let i = 0; i < nights; i += 1) total += prices.get(addDays(checkIn, i)) ?? baseCents;
  return total;
}

/** Precio corto para la celda del calendario: «$1,850», «$12.5k». */
export function shortPrice(cents: number): string {
  const pesos = Math.round(cents / 100);
  if (pesos >= 10_000) {
    const k = Math.round(pesos / 100) / 10;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${pesos.toLocaleString("en-US")}`;
}

/** Convierte lo que escribe el hotel («1,950», «1950.50») a centavos. */
export function parsePesosToCents(input: string): number | null {
  const clean = input.replace(/[$\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents > 0 ? cents : null;
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
  if (message.includes("stay_rooms_invalid")) return "Escribe cuántas habitaciones hay (de 1 a 200).";
  if (message.includes("stay_price_invalid")) return "Escribe un precio mayor a cero.";
  if (message.includes("stay_night_out_of_range")) return "Solo puedes cambiar noches de hoy en adelante.";
  if (message.includes("stay_nights_empty")) return "Elige al menos un día en el calendario.";
  if (message.includes("forbidden")) return "No tienes permiso para hacer este cambio.";
  return "No se pudo completar. Intenta de nuevo.";
}
