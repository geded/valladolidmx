/**
 * Contrato · Alux respeta "de noche" (reporte del Founder 2026-11-20).
 *
 * «Cenote de noche» no debe ofrecer un cenote sin evidencia de que se visita
 * de noche (Suytun); sí la Cena Romántica bajo tierra.
 *
 * Ejecutar con: `bun test scripts/alux/alux-night-fit.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  fitsRequestedTimeOfDay,
  nightFitFromHours,
  nightFitFromStart,
  parseTravelIntent,
} from "../../src/lib/alux/converse-contract";

const base = { summary: null, facts: [] as { id: string; text: string }[], nightFit: null };

describe("Alux · momento del día noche", () => {
  test("«cenote de noche» se entiende como noche", () => {
    expect(parseTravelIntent("Un cenote de noche").timeOfDay).toBe("noche");
  });

  test("un cenote sin horario nocturno no se ofrece de noche", () => {
    const suytun = {
      ...base,
      family: "lugar" as const,
      title: "Cenote Suytun",
      summary: "Cenote tipo caverna",
    };
    expect(fitsRequestedTimeOfDay(suytun, "noche")).toBe(false);
    expect(fitsRequestedTimeOfDay(suytun, null)).toBe(true);
  });

  test("la Cena Romántica bajo tierra sí se ofrece de noche", () => {
    const cena = { ...base, family: "evento" as const, title: "Cena Romántica 20 mts bajo Tierra" };
    expect(fitsRequestedTimeOfDay(cena, "noche")).toBe(true);
  });

  test("un lugar que cierra a las 17:00 no se ofrece de noche", () => {
    const fit = nightFitFromHours([
      { opens_at: "09:00:00", closes_at: "17:00:00", is_closed: false },
    ]);
    expect(fit).toBe("no");
    expect(
      fitsRequestedTimeOfDay(
        { ...base, family: "lugar", title: "Cenote X", nightFit: fit },
        "noche",
      ),
    ).toBe(false);
  });

  test("abierto hasta las 22:00 o pasada la medianoche cuenta como noche", () => {
    expect(nightFitFromHours([{ opens_at: "10:00", closes_at: "22:00", is_closed: false }])).toBe(
      "yes",
    );
    expect(nightFitFromHours([{ opens_at: "18:00", closes_at: "01:00", is_closed: false }])).toBe(
      "yes",
    );
  });

  test("evento que inicia 20:00 hora de Valladolid es de noche; 11:00 no", () => {
    expect(nightFitFromStart("2026-11-21T02:00:00Z")).toBe("yes"); // 20:00 Mérida
    expect(nightFitFromStart("2026-11-21T17:00:00Z")).toBe("no"); // 11:00 Mérida
  });

  test("restaurante u hotel sin horario se conserva de noche", () => {
    expect(
      fitsRequestedTimeOfDay({ ...base, family: "restaurante", title: "Casa X" }, "noche"),
    ).toBe(true);
    expect(fitsRequestedTimeOfDay({ ...base, family: "hotel", title: "Hotel Y" }, "noche")).toBe(
      true,
    );
  });
});
