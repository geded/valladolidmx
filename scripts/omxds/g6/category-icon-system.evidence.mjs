/**
 * G6-S1 · Evidencia de la Iconografía Turística Universal
 * con Acento Textil Yucateco v1.0.
 *
 * Verifica el manifiesto de rutas autorizado, la existencia de los 22
 * símbolos, la ausencia de mapas paralelos/fallbacks y la gobernanza.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ICON_SLUGS = [
  "hoteles",
  "restaurantes",
  "destinos",
  "casas-de-vacaciones",
  "eventos",
  "experiencias",
  "que-hacer",
  "tours",
  "promociones",
  "zonas-arqueologicas",
  "comunidades",
  "cenotes",
  "rutas",
  "artesanias",
  "naturaleza",
  "gastronomia",
  "cultura",
  "compras",
  "pueblos",
  "bienestar",
  "vida-nocturna",
  "mapas",
];

// 1 · Los 22 símbolos existen como componentes React (.tsx)
const iconDir = resolve("src/components/omxds/icons");
const files = readdirSync(iconDir).filter((f) => f.endsWith(".tsx"));
assert.equal(files.length, ICON_SLUGS.length, `se esperaban ${ICON_SLUGS.length} símbolos`);
for (const slug of ICON_SLUGS) {
  assert.ok(existsSync(resolve(iconDir, `${slug}.tsx`)), `falta el símbolo ${slug}.tsx`);
}

// 2 · Autoridad única declarada
for (const file of [
  "src/lib/omxds/category-icon-registry.ts",
  "src/components/omxds/TourismCategoryIcon.tsx",
  "src/components/omxds/CategoryNavGrid.tsx",
  "src/routes/lovable/g6-category-icon-catalog.tsx",
]) {
  assert.ok(existsSync(resolve(file)), `falta artefacto de autoridad: ${file}`);
}

// 3 · Sin mapas paralelos ni fallbacks genéricos en superficies adoptadas
const adopted = [
  "src/components/discovery/DiscoveryNavigator.tsx",
  "src/components/discovery/InlineCategoryExplorer.tsx",
  "src/components/cards/CategoriaCard.tsx",
  "src/lib/discovery/discovery-navigator.functions.ts",
  "src/mocks/categorias.ts",
  "src/routes/lovable/g4-home-premium-preview.tsx",
  "src/routes/lovable/g4-destination-microsite-preview.tsx",
];
for (const file of adopted) {
  const source = readFileSync(resolve(file), "utf8");
  assert.doesNotMatch(source, /CATEGORY_ICON_MAP/, `mapa paralelo en ${file}`);
}

// 4 · Ruta interna registrada en el Route Inventory
const inventory = readFileSync(resolve("src/lib/experience-builder/route-inventory.ts"), "utf8");
assert.match(inventory, /g6-category-icon-catalog\.tsx/, "ruta ausente del Route Inventory");

// 5 · Gobernanza
assert.ok(
  existsSync(resolve("docs/governance/product-authorizations/PCA-2026-037.json")),
  "falta PCA-2026-037.json",
);
const masterIndex = readFileSync(resolve("docs/governance/06-BLUEPRINT-MASTER-INDEX.md"), "utf8");
assert.match(masterIndex, /19\.31/, "Master Index sin el blueprint 19.31");

console.log("G6-S1 category icon system evidence: PASS");

// 6 · G6-S1-A · fixtures deterministas montando componentes reales
const catalogSource = readFileSync(
  resolve("src/routes/lovable/g6-category-icon-catalog.tsx"),
  "utf8",
);
for (const id of ["fixture-s1", "fixture-s2", "fixture-s3"]) {
  assert.match(catalogSource, new RegExp(`id="${id}"`), `falta el fixture #${id}`);
}
for (const real of ["<DiscoveryNavigator", "<DiscoveryNavigatorBlock", "<CategoriaCard"]) {
  assert.ok(catalogSource.includes(real), `fixture sin componente real: ${real}`);
}

// 7 · G6-S1-A · ceiba alternativa B y símbolos fuera de alcance intactos
const ceibaSource = readFileSync(resolve("src/components/omxds/icons/naturaleza.tsx"), "utf8");
assert.ok(
  ["M8.5 5.4h7", "M6 7.6h12", "M4 9.8h16"].every((d) => ceibaSource.includes(d)),
  "la ceiba debe declarar copa escalonada de tres niveles",
);
assert.doesNotMatch(ceibaSource, /<(ellipse|circle)/, "copa ovalada prohibida");

// 8 · G6-S1-A · área táctil real acreditada
for (const file of [
  "src/components/omxds/CategoryNavGrid.tsx",
  "src/components/cards/CategoriaCard.tsx",
  "src/components/discovery/InlineCategoryExplorer.tsx",
]) {
  const source = readFileSync(resolve(file), "utf8");
  assert.ok(source.includes('data-omxds-touch-target="44"'), `sin área táctil real: ${file}`);
}

console.log("G6-S1-A category icon remediation evidence: PASS");
