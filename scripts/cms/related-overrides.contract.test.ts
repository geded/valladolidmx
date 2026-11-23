import { describe, expect, test } from "vitest";
import {
  KIND_LABELS,
  MAX_PINS_SHOWN,
  MODE_HELP,
  MODE_LABELS,
  RELATED_SECTION_NAMES,
  honouredRelatedKinds,
  relatedPanelIntro,
} from "../../src/lib/related/related-overrides-ui";
import { MAX_PINS_PER_SURFACE } from "../../src/lib/related/overrides.functions";

/**
 * El panel embebido en cada editor promete lo que la ficha pública hace.
 * Estas pruebas atan el lenguaje del panel a los filtros reales de cada
 * fetcher público (`business-related`, `product-related`,
 * `destinations/public-reads`, `events/public-reads`).
 */
describe("panel de colección relacionada · lenguaje y alcance", () => {
  test("sólo ofrece los tipos que la ficha pública realmente aplica", () => {
    expect(honouredRelatedKinds("business")).toEqual(["business"]);
    expect(honouredRelatedKinds("product")).toEqual(["product"]);
    expect(honouredRelatedKinds("destination")).toEqual(["business", "product", "event"]);
    expect(honouredRelatedKinds("event")).toEqual(["event"]);
  });

  test("todo lo que el panel ofrece tiene nombre y explicación propios", () => {
    const allKinds = new Set(Object.keys(KIND_LABELS));
    for (const kind of Object.keys(KIND_LABELS) as Array<keyof typeof KIND_LABELS>) {
      const offered = honouredRelatedKinds(kind);
      expect(offered.length).toBeGreaterThan(0);
      for (const offeredKind of offered) {
        expect(allKinds.has(offeredKind)).toBe(true);
        expect(KIND_LABELS[offeredKind].length).toBeGreaterThan(0);
      }
    }
  });

  test("los dos modos se explican en español, sin anglicismos", () => {
    expect(MODE_LABELS.pin).toBe("Aparece primero");
    expect(MODE_LABELS.hide).toBe("Que no aparezca");
    for (const label of Object.values(MODE_LABELS)) {
      expect(label).not.toMatch(/\b(pin|hide|override)\b/i);
    }
    for (const help of Object.values(MODE_HELP)) {
      expect(help.length).toBeGreaterThan(30);
    }
  });

  test("el panel nombra la sección pública que controla", () => {
    expect(RELATED_SECTION_NAMES.business).toBe("«Explora cerca de …»");
    expect(RELATED_SECTION_NAMES.product).toBe("«Sigue descubriendo»");
    const intro = relatedPanelIntro("business");
    expect(intro).toContain("«Explora cerca de …»");
    expect(intro).toContain("reglas automáticas");
  });

  test("el tope que se le promete al editor es el tope real de la ficha", () => {
    expect(MAX_PINS_SHOWN).toBe(MAX_PINS_PER_SURFACE);
  });
});
