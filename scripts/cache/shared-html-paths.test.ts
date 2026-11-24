import { describe, expect, it } from "vitest";
import { isSharedHtmlPath } from "../../src/lib/server/public-page-cache";
describe("páginas públicas guardadas ya armadas", () => {
  it("incluye inicio, destinos y listados", () => {
    for (const p of ["/", "/oriente-maya", "/oriente-maya/izamal", "/oriente-maya/valladolid/hoteles", "/hoteles", "/restaurantes"]) expect(isSharedHtmlPath(p)).toBe(true);
  });
  it("excluye fichas de empresa y paneles privados", () => {
    for (const p of ["/oriente-maya/valladolid/restaurantes/copalli-cafe", "/cms", "/portal/x", "/cuenta"]) expect(isSharedHtmlPath(p)).toBe(false);
  });
});
