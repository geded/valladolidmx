#!/usr/bin/env bun
/**
 * G8-R1-C · Paso C2 — Evidencia estática de la conexión de rutas reales
 * al resolutor canónico (sin red, sin publicación).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = false;

const files = [
  "src/lib/experience-builder/canonical-entity-binding.ts",
  "src/lib/experience-builder/canonical-entity-resolver.ts",
  "docs/evidence/omxds-r1-c2/EVIDENCE-MANIFEST.md",
  "docs/governance/product-authorizations/PCA-2026-051.json",
];
for (const file of files) {
  const ok = fs.existsSync(path.join(root, file));
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} ${file}`);
}

const routes = [
  ["src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx", "bindBusinessRoute"],
  ["src/routes/producto.$slug.tsx", "bindProductRoute"],
  ["src/routes/eventos.$slug.tsx", "bindEventRoute"],
  ["src/routes/oriente-maya/$destino.lugares.$slug.tsx", "bindPlaceRoute"],
];
for (const [file, symbol] of routes) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  const ok = src.includes(symbol);
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} ${file} conectado por ${symbol}`);
}

// Invariantes C2: cero publicación, cero migraciones nuevas, flag apagado.
const migrations = fs.existsSync(path.join(root, "supabase/migrations"))
  ? fs.readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.includes("r1_c2"))
  : [];
const noMigrations = migrations.length === 0;
if (!noMigrations) failed = true;
console.log(`${noMigrations ? "✔" : "✘"} cero migraciones nuevas en C2`);

const sitemap = fs.readFileSync(path.join(root, "src/routes/sitemap[.]xml.ts"), "utf8");
const sitemapClean = !sitemap.includes("r1-c2") && !sitemap.includes("lugares/");
if (!sitemapClean) failed = true;
console.log(`${sitemapClean ? "✔" : "✘"} sitemap sin cambios de C2`);

if (failed) process.exit(1);
console.log("C2 PASS");
