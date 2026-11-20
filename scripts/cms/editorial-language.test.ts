import { describe, expect, test } from "vitest";
import {
  describeEditorialHistory,
  EDITORIAL_STATUS_ORDER,
  getEditorialActionLabel,
  getEditorialStatusLabel,
} from "../../src/lib/cms/editorial-language";

describe("lenguaje editorial claro", () => {
  test("traduce los cinco estados sin cambiar su orden interno", () => {
    expect(EDITORIAL_STATUS_ORDER).toEqual([
      "draft",
      "in_review",
      "approved",
      "published",
      "archived",
    ]);
    expect(EDITORIAL_STATUS_ORDER.map(getEditorialStatusLabel)).toEqual([
      "Borrador",
      "En revisión",
      "Aprobado",
      "Publicado",
      "Archivado",
    ]);
  });

  test("traduce las acciones registradas", () => {
    expect(getEditorialActionLabel("created")).toBe("Contenido creado");
    expect(getEditorialActionLabel("updated")).toBe("Contenido actualizado");
    expect(getEditorialActionLabel("transition")).toBe("Estado cambiado");
  });

  test("explica un cambio de estado como una frase", () => {
    expect(
      describeEditorialHistory({
        action: "transition",
        from_status: "in_review",
        to_status: "approved",
      }),
    ).toBe("Estado cambiado de En revisión a Aprobado");
  });
});