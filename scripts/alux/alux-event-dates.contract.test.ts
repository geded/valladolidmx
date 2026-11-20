/**
 * Contrato · Alux nunca muestra fechas pasadas de un evento (Founder 2026-11-20).
 * Los eventos recurrentes muestran su próxima función; un evento único ya
 * pasado deja de ofrecerse.
 *
 * Ejecutar con: `bun test scripts/alux/alux-event-dates.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import { nextEventOccurrence } from "../../src/lib/events/recurrence";

const now = new Date("2026-11-20T15:00:00Z"); // 09:00 en Valladolid

describe("Alux · fechas de eventos", () => {
  test("serie diaria iniciada en enero muestra la función de hoy 20:00, no el 1 de enero", () => {
    const next = nextEventOccurrence(
      {
        starts_at: "2026-01-02T03:23:00Z",
        recurrence_frequency: "daily",
        recurrence_interval: 1,
        recurrence_until: "2028-01-01",
        schedule_times: [
          { time: "20:00", label: "Español" },
          { time: "20:48", label: "Inglés" },
        ],
      },
      now,
    );
    expect(next?.date).toBe("2026-11-20");
    expect(new Date(next!.startsAt).getTime()).toBeGreaterThan(now.getTime());
  });

  test("evento único ya pasado no tiene próxima función", () => {
    expect(nextEventOccurrence({ starts_at: "2026-09-06T04:17:34Z" }, now)).toBeNull();
  });

  test("serie terminada no se ofrece", () => {
    expect(
      nextEventOccurrence(
        {
          starts_at: "2026-01-01T02:00:00Z",
          recurrence_frequency: "daily",
          recurrence_until: "2026-10-01",
        },
        now,
      ),
    ).toBeNull();
  });
});
