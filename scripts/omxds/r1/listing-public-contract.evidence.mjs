#!/usr/bin/env bun
/**
 * G8-R1 · R1-A · Evidencia estática de la vía canónica única de listados.
 * Comprueba instrumentos, existencia de módulos y ausencia de fixtures en
 * la cadena productiva.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = false;

const files = [
  "docs/blueprint/19.45-G8-R1-PREMIUM-TEMPLATES-PARITY-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-049.json",
  "docs/evidence/omxds-r1/PHASE-0-INVENTORY.md",
  "src/lib/listings/listing-public-contract.ts",
  "src/lib/listings/listing-public-reads.functions.ts",
];
for (const file of files) {
  const ok = fs.existsSync(path.join(root, file));
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} ${file}`);
}

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const contract = read("src/lib/listings/listing-public-contract.ts");
const reads = read("src/lib/listings/listing-public-reads.functions.ts");

const importsFixture = (source) => /^\s*import[^;]*listing-premium-content/m.test(source);
const noFixture = !importsFixture(contract) && !importsFixture(reads);
if (!noFixture) failed = true;
console.log(`${noFixture ? "✔" : "✘"} cadena productiva sin fixtures del catálogo`);

for (const fn of ["listMarketplaceBusinesses", "listPublishedEvents", "listPublishedDestinations"]) {
  const ok = reads.includes(fn);
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} reutiliza la lectura productiva ${fn}`);
}

const noWrites = !/\.(insert|update|upsert|delete)\(/.test(reads);
if (!noWrites) failed = true;
console.log(`${noWrites ? "✔" : "✘"} lectura sin escrituras (cero modificación de datos reales)`);

const sitemap = read("src/routes/sitemap[.]xml.ts");
const sitemapClean = !sitemap.includes("/lugares/");
if (!sitemapClean) failed = true;
console.log(`${sitemapClean ? "✔" : "✘"} sitemap sin fichas de lugar (invariante Q2D-B)`);

if (failed) process.exit(1);
console.log("✔ G8-R1 · R1-A · evidencia estática completa.");
