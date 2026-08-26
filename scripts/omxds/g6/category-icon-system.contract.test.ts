/**
 * G6-S1 · Contrato de la Iconografía Turística Universal
 * con Acento Textil Yucateco v1.0.
 *
 * Verifica autoridad única, inmutabilidad, fail-closed y ausencia de mapas
 * paralelos o fallbacks genéricos en las superficies adoptadas.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CATEGORY_ICON_PALETTE,
  CATEGORY_ICON_REGISTRY,
  CATEGORY_ICON_SLUGS,
  isRegisteredCategory,
  resolveCategoryIcon,
} from "../../../src/lib/omxds/category-icon-registry";

// 1 · Cardinalidad e identidad canónica
assert.equal(CATEGORY_ICON_SLUGS.length, 22, "el registry debe declarar 22 categorías");
assert.equal(new Set(CATEGORY_ICON_SLUGS).size, 22, "slugs duplicados en el registry");

for (const slug of CATEGORY_ICON_SLUGS) {
  const entry = CATEGORY_ICON_REGISTRY[slug]!;
  assert.equal(entry.slug, slug, `slug inconsistente: ${slug}`);
  assert.match(slug, /^[a-z0-9-]+$/, `slug no canónico (kebab-case): ${slug}`);
  assert.ok(entry.label.length > 0, `label vacío: ${slug}`);
  assert.ok(entry.symbol.length > 0, `símbolo sin descripción: ${slug}`);
  assert.ok(entry.primary.light.startsWith("#"), `trazo claro inválido: ${slug}`);
  assert.ok(entry.primary.dark.startsWith("#"), `trazo oscuro inválido: ${slug}`);
}

// 2 · Inmutabilidad del registry y de la paleta
assert.equal(Object.isFrozen(CATEGORY_ICON_REGISTRY), true, "el registry debe estar congelado");
assert.equal(Object.isFrozen(CATEGORY_ICON_PALETTE), true, "la paleta debe estar congelada");

// 3 · Fail-closed
assert.equal(resolveCategoryIcon("categoria-inexistente"), null);
assert.equal(resolveCategoryIcon(null), null);
assert.equal(resolveCategoryIcon(undefined), null);
assert.equal(resolveCategoryIcon("Hoteles"), null, "los slugs PascalCase no se resuelven");
assert.equal(isRegisteredCategory("hoteles"), true);
assert.equal(isRegisteredCategory("Layers"), false);

// 4 · Autoridad única en las superficies adoptadas
const adopted = [
  "src/components/discovery/DiscoveryNavigator.tsx",
  "src/components/discovery/InlineCategoryExplorer.tsx",
  "src/components/cards/CategoriaCard.tsx",
  "src/routes/lovable/g4-home-premium-preview.tsx",
  "src/routes/lovable/g4-destination-microsite-preview.tsx",
  "src/routes/lovable/g6-category-icon-catalog.tsx",
];

for (const file of adopted) {
  const source = readFileSync(resolve(file), "utf8");
  assert.match(
    source,
    /TourismCategoryIcon|CategoryNavGrid/,
    `superficie sin autoridad de iconografía: ${file}`,
  );
  assert.doesNotMatch(source, /CATEGORY_ICON_MAP/, `mapa paralelo detectado en ${file}`);
}

// 5 · Sin fallback genérico ni mapas paralelos en el motor de descubrimiento
const navigator = readFileSync(
  resolve("src/lib/discovery/discovery-navigator.functions.ts"),
  "utf8",
);
assert.doesNotMatch(navigator, /CATEGORY_ICON_MAP/);
assert.doesNotMatch(navigator, /["']Layers["']/, "fallback genérico Layers no permitido");

// 6 · Wrapper único y contrato de tamaños
const wrapper = readFileSync(resolve("src/components/omxds/TourismCategoryIcon.tsx"), "utf8");
assert.match(wrapper, /fail-closed/);
assert.match(wrapper, /spaceCredited/);

console.log("G6-S1 category icon system contract: PASS");
