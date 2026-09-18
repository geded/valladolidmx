import type { PublicDeparture } from "./booking.functions";

export interface DepartureDay {
  key: string;
  date: Date;
  available: number;
  departures: PublicDeparture[];
}

function datePartsKey(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

/** Clave del día de una salida en la zona horaria que administra el producto. */
export function departureDayKey(iso: string, timeZone: string): string {
  return datePartsKey(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(iso)),
  );
}

/** Clave estable para el día local elegido en el calendario visual. */
export function calendarDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calendarDateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

/** Agrupa horarios abiertos y suma los lugares todavía disponibles por día. */
export function groupDeparturesByDay(departures: PublicDeparture[]): DepartureDay[] {
  const days = new Map<string, DepartureDay>();

  for (const departure of departures) {
    const key = departureDayKey(departure.starts_at, departure.timezone);
    if (!key) continue;

    const existing = days.get(key);
    if (existing) {
      existing.available += departure.available;
      existing.departures.push(departure);
      continue;
    }

    days.set(key, {
      key,
      date: calendarDateFromKey(key),
      available: departure.available,
      departures: [departure],
    });
  }

  return Array.from(days.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function defaultDepartureId(departures: PublicDeparture[]): string | null {
  return departures.length === 1 ? (departures[0]?.id ?? null) : null;
}
