import { describe, expect, test } from "vitest";
import {
  businessShortPath,
  shortCategoryMatches,
  singularCategorySlug,
} from "../../src/lib/navigation/short-links";

describe("enlace corto de empresa", () => {
  test("Copalli usa /restaurante/copalli-cafe", () => {
    expect(businessShortPath("restaurantes", "copalli-cafe")).toBe("/restaurante/copalli-cafe");
  });
  test("hoteles se escribe en singular como hotel", () => {
    expect(singularCategorySlug("hoteles")).toBe("hotel");
  });
  test("casas de vacaciones conserva el resto del nombre", () => {
    expect(singularCategorySlug("Casas-de-vacaciones")).toBe("casa-de-vacaciones");
  });
  test("acepta la categoría en plural o singular", () => {
    expect(shortCategoryMatches("restaurante", "restaurantes")).toBe(true);
    expect(shortCategoryMatches("restaurantes", "restaurantes")).toBe(true);
  });
  test("rechaza una categoría que no es la de la empresa", () => {
    expect(shortCategoryMatches("hotel", "restaurantes")).toBe(false);
  });
});
