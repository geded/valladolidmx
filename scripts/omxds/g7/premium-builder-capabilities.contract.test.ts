/**
 * G7-A · Contrato de las Capacidades Premium del Constructor.
 *
 * Verifica registro en la Biblioteca Oficial, presencia en el fixture
 * integrado y en el renderer de producción, defaults gobernados,
 * comportamiento fail-closed y ausencia de importaciones desde previews
 * hacia código de producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(p), "utf8");

const blockLibrary = read("src/lib/experience-builder/block-library.ts");
const renderer = read("src/lib/experience-builder/composition-renderer.tsx");
const fixture = read("src/routes/lovable/g4-home-premium-preview.tsx");
const hero = read("src/components/home/Hero.tsx");
const rutas = read("src/components/home/RutasSection.tsx");
const alux = read("src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx");
const aluxContract = read("src/lib/experience-builder/blocks/alux-planner/contract.ts");
const navigatorBlock = read(
  "src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx",
);

// 1 · Registro en la Biblioteca Oficial
for (const type of [
  "vmx.hero",
  "vmx.alux.planner",
  "vmx.section.rutas",
  "vmx.discovery.navigator",
]) {
  assert.ok(blockLibrary.includes(`type: "${type}"`), `bloque no registrado: ${type}`);
}

// 2 · Presencia en producción (renderer) y en el fixture integrado
for (const type of ["vmx.alux.planner", "vmx.section.rutas", "vmx.discovery.navigator"]) {
  assert.ok(renderer.includes(type), `el renderer de producción no resuelve ${type}`);
}
for (const marker of [
  "<Hero",
  "<DiscoveryNavigatorBlock",
  "<AluxPlannerBlock",
  "<RutasSection",
  'data-g7-fixture="integrated"',
]) {
  assert.ok(fixture.includes(marker), `el fixture integrado no monta ${marker}`);
}

// 3 · El fixture usa los componentes productivos (no imitaciones locales)
for (const imp of [
  'from "@/components/home/Hero"',
  'from "@/components/home/RutasSection"',
  'from "@/components/experience-builder/blocks/alux-planner/AluxPlannerBlock"',
  'from "@/components/experience-builder/blocks/DiscoveryNavigatorBlock"',
]) {
  assert.ok(fixture.includes(imp), `el fixture no importa el componente productivo: ${imp}`);
}
assert.ok(fixture.includes("noindex"), "la preview debe conservar noindex");

// 4 · Cero importaciones desde previews hacia producción
for (const file of [
  "src/lib/experience-builder/block-library.ts",
  "src/lib/experience-builder/composition-renderer.tsx",
  "src/components/home/Hero.tsx",
  "src/components/home/RutasSection.tsx",
  "src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx",
  "src/components/experience-builder/blocks/DiscoveryNavigatorBlock.tsx",
]) {
  assert.ok(
    !read(file).includes("routes/lovable/"),
    `código de producción importa una preview interna: ${file}`,
  );
}

// 5 · Hero conserva `cinematic` como default histórico
assert.ok(
  /variant:\s*\{[\s\S]*?default:\s*"cinematic"/.test(blockLibrary),
  "el default del Hero debe seguir siendo cinematic",
);
assert.ok(
  hero.includes('(config?.variant ?? "cinematic")'),
  "Hero.tsx debe conservar cinematic como comportamiento por defecto",
);
assert.ok(hero.includes('"editorial-split"'), "Hero.tsx debe implementar editorial-split");
assert.ok(hero.includes("data-hero-safe-zone"), "Hero editorial debe declarar zona segura");
assert.ok(hero.includes("mobile_order"), "Hero editorial debe gobernar el orden móvil");
assert.ok(hero.includes("media_side"), "Hero editorial debe gobernar el lado de los medios");

// 6 · Alux es render-only y apunta a /arma-tu-viaje
assert.ok(aluxContract.includes("/arma-tu-viaje"), "el default del CTA de Alux debe ser productivo");
assert.ok(alux.includes("readOnly"), "el campo de Alux debe ser no interactivo");
for (const token of ["useMutation", "supabase", "createServerFn", "localStorage"]) {
  assert.ok(!alux.includes(token), `Alux no debe persistir ni escribir (${token})`);
}
assert.ok(alux.includes("min-h-[44px]"), "los chips de Alux deben medir al menos 44 px");

// 7 · Rutas fail-closed por slug
assert.ok(
  rutas.includes("filter((r): r is SuggestedRoute => Boolean(r))"),
  "RutasSection debe descartar slugs desconocidos (fail-closed)",
);
assert.ok(rutas.includes("show_stops"), "RutasSection debe gobernar la visibilidad de paradas");

// 8 · Navigator: orden manual + fallback automático
for (const field of ["categorySlugs", "hiddenSlugs", "maxItems"]) {
  assert.ok(blockLibrary.includes(`${field}:`), `Studio no expone el campo ${field}`);
  assert.ok(navigatorBlock.includes(field), `el bloque no implementa ${field}`);
}
assert.ok(
  navigatorBlock.includes("manualOrder.length > 0") && navigatorBlock.includes(": derived"),
  "sin lista manual el Navigator debe conservar la derivación automática",
);
assert.ok(
  navigatorBlock.includes("derived.find((c) => c.slug === slug)"),
  "el orden manual debe resolverse contra el DTO (fail-closed)",
);
assert.ok(
  /version:\s*"1\.1\.0"/.test(
    blockLibrary.slice(blockLibrary.indexOf('type: "vmx.discovery.navigator"')),
  ),
  "el Navigator debe declarar contractVersion 1.1.0",
);

// 9 · Defaults válidos del Planificador Alux
for (const key of ["heading", "cta_label", "cta_href", "prompts"]) {
  assert.ok(aluxContract.includes(key), `falta el default ${key} en el contrato de Alux`);
}

console.log("G7-A · contrato de capacidades premium: PASS");
