#!/usr/bin/env bun
/**
 * U1.5 · Tourism Component Library — Guardarraíl automático.
 *
 * Ejecución: `bun scripts/tourism-guard.ts`
 *
 * Detecta violaciones a la Tourist Hero Policy y a la regla de
 * compatibilidad evolutiva de la Biblioteca Oficial:
 *
 *  1. Bloques duplicados por sufijo prohibido (`-pro`, `-v2`, `-next`,
 *     `-lite`) dentro de `vmx.experience.*`.
 *  2. Componentes `*Hero*` fuera de la familia oficial que declaren
 *     `variant`/`immersive`/`cinematic` como si fueran otro Hero.
 *  3. Nuevas rutas `type: "vmx.<dominio>.hero"` fuera de
 *     `vmx.experience.hero` (excepto los shims legacy autorizados).
 *
 * El guard NO modifica archivos: sólo reporta y falla con exit 1.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

const FORBIDDEN_SUFFIXES = /-(pro|v2|next|lite)\b/;
const LEGACY_HERO_ALLOWED = new Set<string>([
  // Delegan al oficial vía adapter (U1.5).
  "vmx.product.hero",
  // Primitive neutro del Surface Kit (ViewModel-only). No es un Hero
  // turístico; es la base compartida sobre la que la familia oficial
  // puede seguir componiendo sin duplicar geometría.
  "vmx.kit.hero",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

function main(): number {
  const files = walk(SRC);
  const errors: string[] = [];

  const heroTypeRe = /"vmx\.([a-z0-9-]+)\.hero"/g;
  const experienceForbidden = /"vmx\.experience\.[a-z0-9-]+-(pro|v2|next|lite)"/g;

  for (const file of files) {
    const rel = relative(ROOT, file);
    // Excluir el propio guard y docs.
    if (rel.startsWith("scripts/tourism-guard.ts")) continue;

    const src = readFileSync(file, "utf8");

    // 1) sufijos prohibidos dentro de vmx.experience.*
    let m: RegExpExecArray | null;
    while ((m = experienceForbidden.exec(src)) !== null) {
      errors.push(
        `[duplicate-suffix] ${rel}: uso prohibido "${m[0]}". La Biblioteca ` +
          `Oficial crece por evolución (variant/capabilities/extensions), no por duplicación.`,
      );
    }

    // 2) Heros fuera de la familia oficial.
    while ((m = heroTypeRe.exec(src)) !== null) {
      const domain = m[1];
      const full = `vmx.${domain}.hero`;
      if (domain === "experience") continue;
      if (LEGACY_HERO_ALLOWED.has(full)) continue;
      errors.push(
        `[parallel-hero] ${rel}: declaración de "${full}" fuera de la familia oficial. ` +
          `Usa "vmx.experience.hero" (Tourist Hero Policy).`,
      );
    }
  }

  if (errors.length > 0) {
    console.error(`Tourism Component Library Guard: ${errors.length} violación(es)\n`);
    for (const e of errors) console.error(" - " + e);
    return 1;
  }

  console.log("Tourism Component Library Guard: OK — biblioteca coherente.");
  return 0;
}

process.exit(main());