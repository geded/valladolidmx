/**
 * Zona horaria oficial de la plataforma.
 *
 * Valladolid.mx opera siempre en la hora del Oriente Maya de Yucatán
 * (America/Merida, UTC-6 sin horario de verano). Toda fecha u hora visible
 * — correos, expedientes, propuestas, reservaciones, itinerarios, recordatorios
 * y avisos — debe formatearse con estos helpers y NUNCA con la zona horaria
 * del dispositivo o del servidor: el viajero y el equipo deben ver siempre la
 * hora del destino.
 */
export const MERIDA_TIME_ZONE = "America/Merida";

/** Locale por defecto de la plataforma. */
export const MERIDA_LOCALE = "es-MX";

export type DestinationDateInput = Date | string | number;


function parseDestinationDate(input: DestinationDateInput): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : new Date(input.getTime());
  }
  if (typeof input === "number") {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const value = input.trim();
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(
  input: DestinationDateInput,
  options: Intl.DateTimeFormatOptions,
  locale = "es-MX",
): string | null {
  const date = parseDestinationDate(input);
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: MERIDA_TIME_ZONE,
  }).format(date);
}

export function formatMeridaDate(input: DestinationDateInput, locale?: string): string | null {
  return format(input, { day: "2-digit", month: "short", year: "numeric" }, locale);
}

export function formatMeridaTime(input: DestinationDateInput, locale?: string): string | null {
  return format(input, { hour: "2-digit", minute: "2-digit", hour12: false }, locale);
}

export function formatMeridaDateTime(input: DestinationDateInput, locale?: string): string | null {
  return format(
    input,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    locale,
  );
}

export function formatMeridaRange(
  start: DestinationDateInput,
  end: DestinationDateInput,
  locale = "es-MX",
): string | null {
  const from = parseDestinationDate(start);
  const to = parseDestinationDate(end);
  if (!from || !to || to.getTime() < from.getTime()) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MERIDA_TIME_ZONE,
  }).formatRange(from, to);
}

/**
 * Formateador genérico en hora de Mérida. Devuelve cadena vacía si la fecha
 * no es válida, para poder usarse directamente en JSX.
 */
export function formatInMerida(
  input: DestinationDateInput | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
  locale: string = MERIDA_LOCALE,
): string {
  if (input === null || input === undefined) return "";
  return format(input, options, locale) ?? "";
}

/** Fecha corta: 14/09/2026. */
export function meridaDate(input: DestinationDateInput | null | undefined, locale?: string) {
  return formatInMerida(input, { day: "2-digit", month: "2-digit", year: "numeric" }, locale);
}

/** Fecha y hora: 14/09/2026, 08:23. */
export function meridaDateTime(input: DestinationDateInput | null | undefined, locale?: string) {
  return formatInMerida(
    input,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    locale,
  );
}

/** Fecha larga: 14 de septiembre de 2026. */
export function meridaLongDate(input: DestinationDateInput | null | undefined, locale?: string) {
  return formatInMerida(input, { day: "numeric", month: "long", year: "numeric" }, locale);
}

/** Día y mes: 14 sep. */
export function meridaDayMonth(input: DestinationDateInput | null | undefined, locale?: string) {
  return formatInMerida(input, { day: "numeric", month: "short" }, locale);
}

/** Hora del destino: 08:23. */
export function meridaClock(input: DestinationDateInput | null | undefined, locale?: string) {
  return formatInMerida(input, { hour: "2-digit", minute: "2-digit", hour12: false }, locale);
}

/** Fecha de hoy en el destino, en formato ISO `YYYY-MM-DD`. */
export function meridaToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MERIDA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}
