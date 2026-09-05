/**
 * Lote 3E · Contrato de confianza de datos públicos.
 *
 * Impide reintroducir fixtures locales como fuente de contenido en ejecución
 * pública:
 *  1. Ningún módulo de `src/` importa `@/mocks/*` (ni rutas relativas hacia
 *     `src/mocks`) salvo la lista blanca explícita: los propios fixtures y las
 *     vistas previas internas `/lovable/*` que declaran `noindex`.
 *  2. `experience-demo-dataset` no existe ni se importa: Experiencias tiene
 *     una única fuente canónica (`products` con `product_type = 'experiencia'`).
 *  3. Ninguna ruta pública (`src/routes/**` fuera de `lovable/`,
 *     `_authenticated/` y `preview/`) importa fixtures.
 *
 * Ejecutar con: `bun test scripts/experiences/public-data-sources.contract.test.ts`
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const SRC = join(ROOT, "src");

const SOURCE_EXT = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
      continue;
    }
    const dot = entry.lastIndexOf(".");
    if (dot >= 0 && SOURCE_EXT.has(entry.slice(dot))) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return relative(ROOT, file).split(sep).join("/");
}

const IMPORT_RE =
  /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g;

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const specs: string[] = [];
  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2] ?? match[3];
    if (spec) specs.push(spec);
  }
  return specs;
}

function importsMocks(file: string): string[] {
  return importsOf(file).filter((spec) => {
    if (spec.startsWith("@/mocks/") || spec === "@/mocks") return true;
    if (spec.startsWith(".")) {
      const target = resolve(file, "..", spec).split(sep).join("/");
      return target.includes("/src/mocks/") || target.endsWith("/src/mocks");
    }
    return false;
  });
}

function importsDemoDataset(file: string): string[] {
  return importsOf(file).filter((spec) => spec.includes("experience-demo-dataset"));
}

/** Vistas previas internas: deben declarar `noindex` para quedar exentas. */
function declaresNoindex(file: string): boolean {
  const text = readFileSync(file, "utf8");
  return /name:\s*["']robots["'][^}]*content:\s*["'][^"']*noindex/s.test(text);
}

const allSources = walk(SRC);

describe("Lote 3E · datos públicos CMS-first", () => {
  test("ningún módulo público importa @/mocks/*", () => {
    const offenders: string[] = [];
    for (const file of allSources) {
      const path = rel(file);
      if (path.startsWith("src/mocks/")) continue;
      const hits = importsMocks(file);
      if (!hits.length) continue;
      const internalPreview = path.startsWith("src/routes/lovable/") && declaresNoindex(file);
      if (internalPreview) continue;
      offenders.push(`${path} → ${hits.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  test("las vistas previas internas que usan fixtures declaran noindex", () => {
    const missing: string[] = [];
    for (const file of allSources) {
      const path = rel(file);
      if (!path.startsWith("src/routes/lovable/")) continue;
      if (importsMocks(file).length && !declaresNoindex(file)) missing.push(path);
    }
    expect(missing).toEqual([]);
  });

  test("experience-demo-dataset ya no existe ni se importa", () => {
    expect(existsSync(join(SRC, "lib/experiences/experience-demo-dataset.ts"))).toBe(false);
    const offenders = allSources.filter((file) => importsDemoDataset(file).length > 0).map(rel);
    expect(offenders).toEqual([]);
  });

  test("ninguna ruta pública importa fixtures", () => {
    const offenders: string[] = [];
    for (const file of allSources) {
      const path = rel(file);
      if (!path.startsWith("src/routes/")) continue;
      if (
        path.startsWith("src/routes/lovable/") ||
        path.startsWith("src/routes/_authenticated/") ||
        path.startsWith("src/routes/preview/")
      )
        continue;
      const hits = [...importsMocks(file), ...importsDemoDataset(file)];
      if (hits.length) offenders.push(`${path} → ${hits.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  test("el lector público de Experiencias sólo admite registros publicados", () => {
    const fn = readFileSync(
      join(SRC, "lib/experiences/experience-public-reads.functions.ts"),
      "utf8",
    );
    const server = readFileSync(
      join(SRC, "lib/experiences/experience-public-reads.server.ts"),
      "utf8",
    );
    // La función pública no acepta estados editoriales desde el cliente.
    const publicBlock = fn.slice(
      fn.indexOf("export const getExperiencesListing"),
      fn.indexOf("export const getExperiencesReviewListing"),
    );
    expect(publicBlock).not.toMatch(
      /in_review|statuses|includeInReview|service_role|supabaseAdmin/,
    );
    // El estado por defecto del lector es exclusivamente `published`.
    expect(server).toMatch(/:\s*\["published"\]/);
    // El lector de revisión exige rol editorial.
    const reviewBlock = fn.slice(fn.indexOf("export const getExperiencesReviewListing"));
    expect(reviewBlock).toMatch(/requireSupabaseAuth/);
    expect(reviewBlock).toMatch(/is_editor_or_admin/);
    expect(reviewBlock).not.toMatch(/supabaseAdmin|client\.server/);
  });
});
