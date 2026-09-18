import { describe, expect, test } from "bun:test";
import {
  defaultDepartureId,
  groupDeparturesByDay,
} from "../../src/lib/commerce/booking-calendar";
import type { PublicDeparture } from "../../src/lib/commerce/booking.functions";

const departures: PublicDeparture[] = [
  {
    id: "morning",
    starts_at: "2026-09-19T15:00:00.000Z",
    ends_at: "2026-09-19T17:00:00.000Z",
    timezone: "America/Merida",
    available: 4,
  },
  {
    id: "evening",
    starts_at: "2026-09-20T01:00:00.000Z",
    ends_at: "2026-09-20T03:00:00.000Z",
    timezone: "America/Merida",
    available: 3,
  },
  {
    id: "next-day",
    starts_at: "2026-09-20T15:00:00.000Z",
    ends_at: "2026-09-20T17:00:00.000Z",
    timezone: "America/Merida",
    available: 8,
  },
];

describe("calendario público de reservaciones", () => {
  test("agrupa en la hora del destino y suma los lugares disponibles del día", () => {
    const days = groupDeparturesByDay(departures);

    expect(days.map((day) => day.key)).toEqual(["2026-09-19", "2026-09-20"]);
    expect(days[0]?.available).toBe(7);
    expect(days[0]?.departures.map((departure) => departure.id)).toEqual(["morning", "evening"]);
  });

  test("preselecciona únicamente cuando el día tiene un solo horario", () => {
    const days = groupDeparturesByDay(departures);

    expect(defaultDepartureId(days[0]?.departures ?? [])).toBeNull();
    expect(defaultDepartureId(days[1]?.departures ?? [])).toBe("next-day");
  });
});