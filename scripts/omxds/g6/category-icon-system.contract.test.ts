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
//
// Nota contractual (G7 · addendum 2026-08-27): `src/components/cards/CategoriaCard.tsx`
// pertenece a la Home pública legacy y NO debe adoptar la iconografía bordada antes de
// publicar la composición Home premium. Por eso queda fuera de la lista `adopted`; el
// gate permanece fail-closed y sigue cubriendo todas las superficies premium reales.
const adopted = [
  "src/components/discovery/DiscoveryNavigator.tsx",
  "src/components/discovery/InlineCategoryExplorer.tsx",
  "src/routes/lovable/g4-home-premium-preview.tsx",
  "src/routes/lovable/g4-destination-microsite-preview.tsx",
  "src/routes/lovable/g6-category-icon-catalog.tsx",
];

// G8-E1 · Cadena real de autoridad tras extraer las superficies compartidas:
//   preview → superficie premium compartida → CompositionRenderer → preset
//   registrado → TourismCategoryIcon → PNG aprobado.
// La delegación es un allowlist cerrado: sólo estas superficies compartidas
// pueden acreditar la autoridad por delegación, y el delegado debe contener
// la autoridad real. Cualquier otro caso sigue fallando (fail-closed).
const DELEGATED_AUTHORITY: Record<string, string> = {
  "src/routes/lovable/g4-destination-microsite-preview.tsx":
    "src/components/destination-premium/DestinationPremiumSurface.tsx",
  "src/routes/lovable/g4-home-premium-preview.tsx":
    "src/components/home-premium/HomePremiumSurface.tsx",
};

const AUTHORITY = /TourismCategoryIcon|CategoryNavGrid/;

for (const file of adopted) {
  const source = readFileSync(resolve(file), "utf8");
  if (!AUTHORITY.test(source)) {
    const delegate = DELEGATED_AUTHORITY[file];
    assert.ok(delegate, `superficie sin autoridad de iconografía: ${file}`);
    assert.ok(
      source.includes(delegate!.replace(/^src\//, "@/").replace(/\.tsx$/, "")),
      `la superficie ${file} no importa su delegado acreditado ${delegate}`,
    );
    const delegateSource = readFileSync(resolve(delegate!), "utf8");
    assert.match(
      delegateSource,
      AUTHORITY,
      `el delegado no ejerce la autoridad de iconografía: ${delegate}`,
    );
    assert.doesNotMatch(delegateSource, /CATEGORY_ICON_MAP/, `mapa paralelo en ${delegate}`);
  }
  assert.doesNotMatch(source, /CATEGORY_ICON_MAP/, `mapa paralelo detectado en ${file}`);
}

// 4-bis · La cadena de render premium consume las superficies compartidas y el
// preset registrado consume la misma autoridad visual (sin duplicar bloques).
const renderer = readFileSync(
  resolve("src/lib/experience-builder/composition-renderer.tsx"),
  "utf8",
);
for (const surface of ["HomePremiumSurface", "DestinationPremiumSurface"]) {
  assert.ok(renderer.includes(surface), `el CompositionRenderer no consume ${surface}`);
}
const iconWrapper = readFileSync(resolve("src/components/omxds/TourismCategoryIcon.tsx"), "utf8");
assert.match(
  iconWrapper,
  /\/brand\/category-icons\/\$\{entry\.slug\}\.png/,
  "el wrapper debe resolver el PNG aprobado por slug",
);

// 5 · Sin fallback genérico ni mapas paralelos en el motor de descubrimiento
const navigator = readFileSync(
  resolve("src/lib/discovery/discovery-navigator.functions.ts"),
  "utf8",
);
assert.doesNotMatch(navigator, /CATEGORY_ICON_MAP/);
assert.doesNotMatch(navigator, /["']Layers["']/, "fallback genérico Layers no permitido");

// 6 · Wrapper único y contrato de tamaños
const wrapper = readFileSync(resolve("src/components/omxds/TourismCategoryIcon.tsx"), "utf8");
assert.match(wrapper, /fail[- ]closed/);
assert.match(wrapper, /spaceCredited/);

console.log("G6-S1 category icon system contract: PASS");

// 7 · G6-S1-A · D-G6-01 — Ceiba/ya’axché alternativa B (copa escalonada)
const ceiba = readFileSync(resolve("src/components/omxds/icons/naturaleza.tsx"), "utf8");
assert.match(ceiba, /M8\.5 5\.4h7/, "falta el nivel superior de copa (7 u)");
assert.match(ceiba, /M6 7\.6h12/, "falta el nivel medio de copa (12 u)");
assert.match(ceiba, /M4 9\.8h16/, "falta el nivel inferior de copa (16 u)");
assert.doesNotMatch(ceiba, /<(ellipse|circle)/, "la copa no puede ser ovalada ni circular");
assert.match(ceiba, /M12 10\.2v9\.4/, "falta el tronco central continuo");
assert.match(ceiba, /M12 19\.6 8\.2 21\.4M12 19\.6v1\.9M12 19\.6l3\.8 1\.8/, "faltan 3 raíces");

// 8 · G6-S1-A · D-G6-02 — Área táctil real ≥ 44×44 px en los controles reales
// `CategoriaCard.tsx` queda fuera por la misma razón contractual del bloque 4:
// pertenece a la Home pública legacy y no adopta la iconografía bordada todavía.
const touchSurfaces = [
  "src/components/omxds/CategoryNavGrid.tsx",
  "src/components/discovery/InlineCategoryExplorer.tsx",
];
for (const file of touchSurfaces) {
  const source = readFileSync(resolve(file), "utf8");
  assert.match(source, /min-h-\[44px\]/, `sin garantía de alto táctil real: ${file}`);
  assert.match(source, /min-w-\[44px\]/, `sin garantía de ancho táctil real: ${file}`);
  assert.match(source, /data-omxds-touch-target="44"/, `sin instrumentación táctil: ${file}`);
}
// El wrapper de iconografía no introduce interactividad anidada.
assert.doesNotMatch(wrapper, /<button|<a\s|role="button"|tabIndex/, "wrapper con interactividad");
assert.match(wrapper, /data-omxds-icon-size/, "wrapper sin instrumentación de tamaño");

// 9 · G6-S1-A · D-G6-03 — Fixtures locales que montan componentes reales
const catalog = readFileSync(resolve("src/routes/lovable/g6-category-icon-catalog.tsx"), "utf8");
for (const id of ["fixture-s1", "fixture-s2", "fixture-s3"]) {
  assert.match(catalog, new RegExp(`id="${id}"`), `falta el fixture #${id}`);
}
assert.match(catalog, /<DiscoveryNavigator\b/, "S1 debe montar DiscoveryNavigator real");
assert.match(catalog, /<DiscoveryNavigatorBlock\b/, "S2 debe montar el bloque real");
assert.match(catalog, /previewData=\{/, "S2 debe usar previewData literal");
assert.match(catalog, /<CategoriaCard\b/, "S3 debe montar CategoriaCard real");
assert.match(catalog, /CATEGORIAS_MOCK/, "S3 debe usar CATEGORIAS_MOCK");
assert.doesNotMatch(catalog, /supabase/i, "los fixtures no pueden usar backend");

console.log("G6-S1-A remediation contract: PASS");
