/**
 * Contrato · Correcciones Alux/listados autorizadas 2026-10-22.
 *
 * Reglas verificadas (una por test, valores concretos de la auditoría):
 *  1. La búsqueda de cercanía del chat público pide `name` a
 *     `business_categories` (la columna `display_name` no existe en la base;
 *     con ella la consulta falla y Alux siempre respondía "no hay negocios
 *     cercanos").
 *  2. El listado público de experiencias aplica el peso de visibilidad del
 *     CMS (`business_effective_visibility` levers discovery_boost /
 *     search_weight) con el mismo criterio que los listados de empresas:
 *     peso DESC y desempate alfabético.
 *  3. Ninguna lectura de latitud/longitud del planificador de viaje convierte
 *     una coordenada ausente a (0,0): `Number(null) === 0`, por eso toda
 *     conversión `Number(...)` sobre lat/lng exige un guardia `== null`
 *     previo en el mismo bloque.
 *
 * Ejecutar con: `bun test scripts/alux/alux-nearby-visibility-geo.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("chat público · búsqueda de cercanía", () => {
  test("pide `name` (no `display_name`) a business_categories", () => {
    const src = read("src/routes/api/public/alux/chat.ts");
    expect(src).toContain("business_categories!businesses_primary_category_id_fkey ( slug, name )");
    expect(src).not.toContain(
      "business_categories!businesses_primary_category_id_fkey ( slug, display_name )",
    );
  });
});

describe("listado de experiencias · peso de visibilidad", () => {
  test("lee business_effective_visibility y ordena peso DESC, luego alfabético", () => {
    const src = read("src/lib/experiences/experience-public-reads.server.ts");
    expect(src).toContain('.from("business_effective_visibility")');
    expect(src).toContain("discovery_boost");
    expect(src).toContain("search_weight");
    expect(src).toContain("if (scoreB !== scoreA) return scoreB - scoreA;");
    expect(src).toContain('localeCompare(b.name, "es")');
  });
});

describe("planificador de viaje · coordenadas ausentes", () => {
  const GEO_FILES = [
    "src/lib/traveler/travel-plan-geo.functions.ts",
    "src/lib/traveler/travel-plan-optimize.functions.ts",
    "src/lib/traveler/travel-plan-schedule.functions.ts",
  ];

  test("toda conversión Number() sobre lat/lng tiene guardia == null previa en su bloque", () => {
    for (const rel of GEO_FILES) {
      const src = read(rel);
      // Bloques separados por llaves de cierre a nivel de columna 0-6.
      const blocks = src.split(/\n {0,6}\}\n/);
      for (const block of blocks) {
        const converts =
          /Number\((?:\([^)]*\)|\w+)\.(?:latitude|longitude)\)/.test(block) ||
          /Number\((?:rawLat|rawLng)\)/.test(block);
        if (!converts) continue;
        expect(
          /(?:latitude|longitude|rawLat|rawLng)\s*==\s*null/.test(block),
        ).toBe(true);
      }
    }
  });

  test("Number(null) sería 0: la regla documentada permanece junto a cada guardia", () => {
    for (const rel of GEO_FILES) {
      expect(read(rel)).toContain("Number(null) === 0");
    }
  });
});
