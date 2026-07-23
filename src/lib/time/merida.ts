export const MERIDA_TIME_ZONE = "America/Merida";

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
    { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false },
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
