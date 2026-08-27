/**
 * G7-A · Evidencia de las Capacidades Premium del Constructor.
 *
 * Verifica el manifiesto exacto de rutas, la existencia del fixture
 * integrado, la evidencia visual documentada y la gobernanza asociada.
 * No escribe datos, no publica composiciones y no toca activos de marca.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p) => readFileSync(resolve(p), "utf8");

// 1 · Manifiesto de rutas del addendum G7-A
const ROUTES = [
  "src/routes/lovable/g4-home-premium-preview.tsx",
  "src/lib/experience-builder/block-library.ts",
  "src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx",
  "scripts/omxds/g7/premium-builder-capabilities.contract.test.ts",
  "scripts/omxds/g7/premium-builder-capabilities.evidence.mjs",
  "docs/evidence/omxds-g7/premium-builder-capabilities.md",
  "docs/governance/addenda/PCA-2026-038-ADDENDUM-A.json",
  "docs/blueprint/19.32-G7-PREMIUM-BUILDER-CAPABILITIES-v1.0.md",
  "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  "package.json",
];
for (const route of ROUTES) {
  assert.ok(existsSync(resolve(route)), `falta la ruta autorizada: ${route}`);
}

// 2 · Fixture integrado: cuatro capacidades sobre componentes productivos
const fixture = read("src/routes/lovable/g4-home-premium-preview.tsx");
for (const marker of [
  'data-g7-fixture="integrated"',
  'variant: "editorial-split"',
  "<DiscoveryNavigatorBlock",
  "<AluxPlannerBlock",
  "<RutasSection",
  "/arma-tu-viaje",
  "noindex",
]) {
  assert.ok(fixture.includes(marker), `el fixture integrado no acredita: ${marker}`);
}

// 3 · Curaduría manual gobernada del Navigator
const navigator = read("src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx");
for (const token of ["categorySlugs", "hiddenSlugs", "maxItems", "readSlugList"]) {
  assert.ok(navigator.includes(token), `el Navigator no implementa ${token}`);
}

// 4 · Prohibiciones del addendum: sin mapas paralelos ni activos tocados
assert.ok(
  !navigator.includes("category-icons/"),
  "prohibido construir rutas de íconos fuera de TourismCategoryIcon",
);
const icon = read("src/components/omxds/TourismCategoryIcon.tsx");
assert.ok(
  icon.includes("approved-embroidered-artwork-v1"),
  "la autoridad de iconografía bordada debe permanecer intacta",
);

// 5 · Evidencia visual documentada en los seis anchos exigidos
const evidence = read("docs/evidence/omxds-g7/premium-builder-capabilities.md");
for (const width of ["390", "430", "768", "1024", "1280", "1440"]) {
  assert.ok(evidence.includes(`${width} px`), `falta la evidencia visual de ${width} px`);
}
for (const claim of ["overflow", "44", "/arma-tu-viaje", "fail-closed"]) {
  assert.ok(evidence.includes(claim), `la evidencia no declara: ${claim}`);
}

// 6 · Gobernanza
const addendum = JSON.parse(read("docs/governance/addenda/PCA-2026-038-ADDENDUM-A.json"));
assert.equal(addendum.effective_date, "2026-08-27");
assert.equal(addendum.parent_authorization, "PCA-2026-038");
assert.equal(addendum.flag_state, "omxds_visual_v1_contracts_enabled=false");
assert.ok(Array.isArray(addendum.authorized_routes) && addendum.authorized_routes.length > 0);

console.log(`G7-A · evidencia de capacidades premium: PASS (${ROUTES.length} rutas verificadas)`);
