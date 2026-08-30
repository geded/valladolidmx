#!/usr/bin/env bun
/**
 * G8-Q2D-B · Evidencia estática de la conexión productiva de Lugares.
 * Verifica que el manifiesto, el blueprint y el instrumento existan y
 * declaren las restricciones vigentes (sin publicación, sin redirects,
 * sin sitemap, flag en false).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "docs/blueprint/19.44-G8-Q2D-B-PLACE-PRODUCTIVE-CONNECTION-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-048.json",
  "docs/evidence/omxds-q2d-b/EVIDENCE-MANIFEST.md",
  "src/routes/oriente-maya/$destino.lugares.$slug.tsx",
  "src/components/cms/places/PlacePresentationPanel.tsx",
  "src/lib/places/place-presentation.functions.ts",
  "src/lib/places/place-public-contract.ts",
  "src/lib/places/place-public-reads.server.ts",
  "src/lib/places/place-public-reads.functions.ts",
];

let failed = false;
for (const file of files) {
  const ok = fs.existsSync(path.join(root, file));
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} ${file}`);
}

const manifest = fs.readFileSync(
  path.join(root, "docs/evidence/omxds-q2d-b/EVIDENCE-MANIFEST.md"),
  "utf8",
);
for (const claim of [
  "Cero publicación",
  "omxds_visual_v1_contracts_enabled = false",
  "Borrador · no publicado",
  "marcador neutral",
]) {
  const ok = manifest.includes(claim);
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} manifiesto declara: ${claim}`);
}

const sitemap = fs.readFileSync(path.join(root, "src/routes/sitemap[.]xml.ts"), "utf8");
const sitemapClean = !sitemap.includes("/lugares/");
if (!sitemapClean) failed = true;
console.log(`${sitemapClean ? "✔" : "✘"} sitemap sin fichas de lugar`);

if (failed) process.exit(1);
console.log("✔ G8-Q2D-B · evidencia estática completa.");
