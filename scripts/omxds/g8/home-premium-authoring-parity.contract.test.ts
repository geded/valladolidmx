/**
 * G8 · Contrato de Paridad de Autoría de la Home Premium (19.33).
 *
 * Verifica que la política editorial autorice, exclusivamente sobre la
 * superficie `home`, los contratos productivos que la Home premium G4 ya
 * emplea; que el arnés histórico I4-0 no se aplique a la validación de
 * árboles; y que el comportamiento siga siendo fail-closed.
 */
import assert from "node:assert/strict";
import {
  EDITORIAL_BUILDER_POLICY,
  canListEditorialBlock,
  validateEditorialCompositionTree,
} from "../../../src/lib/experience-builder/editorial-builder-policy";

const G8_TYPES = [
  "vmx.hero",
  "vmx.smart.destinations-grid",
  "vmx.smart.businesses-grid",
  "vmx.smart.products-grid",
  "vmx.smart.events-list",
  "vmx.section.rutas",
  "vmx.section.arma-tu-viaje",
  "vmx.experience.map",
] as const;

// 1 · Registro authorable sobre la superficie home
for (const type of G8_TYPES) {
  const block = EDITORIAL_BUILDER_POLICY.blocks.find((candidate) => candidate.type === type);
  assert.ok(block, `bloque no registrado en la política editorial: ${type}`);
  assert.equal(block.mode, "authorable", `${type} debe ser authorable`);
  assert.ok(block.surfaces.includes("home"), `${type} debe autorizarse en home`);
  assert.ok(
    block.authoring_roles.includes("founder_admin"),
    `${type} debe ser editable por founder_admin`,
  );
  assert.ok(
    !block.authoring_roles.includes("business_author"),
    `${type} no debe abrirse a business_author`,
  );
  assert.equal(
    canListEditorialBlock(type, "home", "founder_admin"),
    true,
    `${type} debe listarse en la biblioteca de home`,
  );
  assert.equal(
    canListEditorialBlock(type, "home", "business_author"),
    false,
    `${type} no debe listarse para business_author`,
  );
}

// 2 · La variante editorial-split queda habilitada sólo en vmx.hero
const heroBlock = EDITORIAL_BUILDER_POLICY.blocks.find((block) => block.type === "vmx.hero")!;
assert.deepEqual(
  [...heroBlock.variants].sort(),
  ["cinematic", "editorial-split"],
  "vmx.hero debe declarar exactamente cinematic y editorial-split",
);

// 3 · El árbol productivo se valida sin el arnés histórico I4-0
const okTree = validateEditorialCompositionTree({
  tree: {
    root: {
      children: [
        { type: "vmx.hero", version: "1.3.0", config: { variant: "editorial-split" } },
        { type: "vmx.section.rutas", version: "1.1.0", config: { source: "manual" } },
      ],
    },
  },
  surface: "home",
  actor: "founder_admin",
  registered_media_paths: [],
});
assert.equal(okTree.valid, true, `árbol premium rechazado: ${okTree.errors.join(" | ")}`);

// 4 · Fail-closed: variantes fuera del enum, superficies y alias históricos
const badVariant = validateEditorialCompositionTree({
  tree: { root: { children: [{ type: "vmx.hero", version: "1.3.0", config: { variant: "media_left" } }] } },
  surface: "home",
  actor: "founder_admin",
  registered_media_paths: [],
});
assert.equal(badVariant.valid, false, "la variante histórica media_left debe rechazarse");

const badSurface = validateEditorialCompositionTree({
  tree: { root: { children: [{ type: "vmx.hero", version: "1.3.0", config: { variant: "cinematic" } }] } },
  surface: "business",
  actor: "founder_admin",
  registered_media_paths: [],
});
assert.equal(badSurface.valid, false, "vmx.hero no debe autorizarse fuera de home/landing");

const alias = validateEditorialCompositionTree({
  tree: { root: { children: [{ type: "vmx.hero.alias", version: "1.0.0", config: {} }] } },
  surface: "home",
  actor: "founder_admin",
  registered_media_paths: [],
});
assert.equal(alias.valid, false, "los alias desconocidos deben seguir congelados");

console.log("G8 · contrato de paridad de autoría de la Home premium: PASS");
