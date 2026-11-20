import { describe, expect, test } from "bun:test";
import {
  buildOfficialTemplateStructure,
  buildPresetCompositionTree,
  defaultPresetIdForPageKind,
} from "../../../src/lib/experience-builder/official-template-structure";

describe("Estructura oficial de plantillas del constructor", () => {
  const families = buildOfficialTemplateStructure();

  test("ordena las familias de forma estable y editorial", () => {
    expect(families.map((f) => f.key)).toEqual([
      "inicio",
      "destinos",
      "listados",
      "lugares",
      "fichas",
      "landing",
    ]);
  });

  test("declara las 21 plantillas aprobadas sin listas paralelas", () => {
    const total = families.reduce((acc, f) => acc + f.entries.length, 0);
    expect(total).toBe(21);
    expect(families.find((f) => f.key === "listados")?.entries.length).toBe(6);
    expect(families.find((f) => f.key === "lugares")?.entries.length).toBe(6);
    expect(families.find((f) => f.key === "fichas")?.entries.length).toBe(6);
  });

  test("cada listado turístico declara su página de trabajo editable", () => {
    const listados = families.find((f) => f.key === "listados")!;
    for (const entry of listados.entries) {
      expect(entry.workingSlug).toBeTruthy();
      expect(entry.creatable).toBe(true);
    }
  });

  test("las fichas de entidad no se crean a mano", () => {
    const fichas = families.find((f) => f.key === "fichas")!;
    for (const entry of fichas.entries) expect(entry.creatable).toBe(false);
  });

  test("asigna plantilla por defecto por sección y es fail-closed", () => {
    expect(defaultPresetIdForPageKind("home")).toBe("premium-g4-approved");
    expect(defaultPresetIdForPageKind("destination")).toBe("destino-premium-g4-approved");
    expect(defaultPresetIdForPageKind("seccion-inexistente")).toBeNull();
  });

  test("construye el árbol inicial desde el preset aprobado", () => {
    const tree = buildPresetCompositionTree("premium-g4-approved") as unknown as {
      root: { children: Array<{ type: string }> };
    };
    expect(tree.root.children[0]?.type).toBe("vmx.home.premium-g4");
    expect(buildPresetCompositionTree("no-existe")).toBeNull();
  });
});
