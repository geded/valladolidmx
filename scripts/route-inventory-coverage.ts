#!/usr/bin/env bun
/**
 * Route Inventory · Coverage Check
 *
 * Escanea `src/routes/` y verifica que toda ruta esté declarada en el
 * Route Inventory oficial (DOS · SSC-01·P2). Falla el proceso si:
 *
 *   - Aparece una ruta nueva sin entry (nadie decidió su categoría,
 *     madurez, prioridad, propietario…).
 *   - Aparece un entry cuya ruta ya no existe (limpieza pendiente).
 *   - Un entry carece de metadatos obligatorios.
 *
 * Uso: `bun run scripts/route-inventory-coverage.ts`
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { assertRouteInventoryCoverage } from "../src/lib/experience-builder/route-inventory";

const ROOT = join(process.cwd(), "src", "routes");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT)
  .map((abs) => "src/" + relative(join(process.cwd(), "src"), abs).replaceAll("\\", "/"))
  .filter((f) => f !== "src/routes/routeTree.gen.ts");

try {
  assertRouteInventoryCoverage(files);
  console.log(`✔ Route Inventory: ${files.length} rutas cubiertas.`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}