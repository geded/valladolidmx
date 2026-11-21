/**
 * Pruebas con visitantes simulados · la estimación previa («Lo que va a crear»)
 * debe abarcar lo que el motor realmente genera para cada tamaño.
 */
import { describe, expect, it } from "bun:test";
import { runScenario } from "../src/lib/visitor-intel/simulation/engine";
import {
  buildOrienteMayaScenario,
  estimateVolume,
} from "../src/lib/visitor-intel/simulation/scenarios/oriente-maya-90d";

const RUN_ID = "00000000-0000-4000-8000-000000000000";

describe("estimación de movimientos de una prueba simulada", () => {
  it("la prueba pequeña estima entre 2,000 y 4,000 movimientos para 1,000 visitantes", () => {
    const v = estimateVolume("light");
    expect(v.visitors).toBe(1_000);
    expect(v.events_low).toBe(2_000);
    expect(v.events_high).toBe(4_000);
  });

  it("lo que crea la prueba pequeña cae dentro de la estimación", () => {
    const v = estimateVolume("light");
    for (const seed of ["VMX-DEMO-01", "A", "D", "F"]) {
      const scenario = buildOrienteMayaScenario({ seed, scale: "light" });
      const events = runScenario({ scenario, runId: RUN_ID }).events.length;
      expect(events).toBeGreaterThanOrEqual(v.events_low);
      expect(events).toBeLessThanOrEqual(v.events_high);
    }
  });
});
