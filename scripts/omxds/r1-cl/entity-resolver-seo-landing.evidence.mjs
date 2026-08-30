#!/usr/bin/env bun
/**
 * G8-R1-C+L · Evidencia estática del resolutor canónico y de la plantilla
 * reusable premium-seo-landing.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "docs/blueprint/19.46-G8-R1-C-L-RESOLVER-AND-SEO-LANDING-v1.0.md",
  "docs/governance/product-authorizations/PCA-2026-050.json",
  "docs/evidence/omxds-r1-cl/EVIDENCE-MANIFEST.md",
  "src/lib/experience-builder/canonical-entity-resolver.ts",
  "src/lib/experience-builder/seo-landing/seo-landing-template.ts",
  "src/routes/lovable/g8-r1cl-seo-landing-parity.tsx",
  "docs/governance/addenda/PCA-2026-050-ADDENDUM-B.json",
  "src/lib/experience-builder/seo-landing/seo-landing-creation.ts",
  "src/lib/experience-builder/seo-landing/seo-landing-creation.functions.ts",
  "src/components/cms/SeoLandingAction.tsx",
];

let failed = false;
for (const file of files) {
  const ok = fs.existsSync(path.join(root, file));
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} ${file}`);
}

const sitemap = fs.readFileSync(path.join(root, "src/routes/sitemap[.]xml.ts"), "utf8");
const clean = !sitemap.includes("g8-r1cl");
if (!clean) failed = true;
console.log(`${clean ? "✔" : "✘"} sitemap sin la preview interna`);

const template = fs.readFileSync(
  path.join(root, "src/lib/experience-builder/seo-landing/seo-landing-template.ts"),
  "utf8",
);
const slots = (template.match(/order: \d+/g) ?? []).length;
const okSlots = slots === 18;
if (!okSlots) failed = true;
console.log(`${okSlots ? "✔" : "✘"} plantilla con 18 slots (${slots})`);

if (failed) process.exit(1);
console.log("✔ G8-R1-C+L · evidencia estática completa.");
