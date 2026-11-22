import { describe, expect, it } from "vitest";
import {
  accentInsensitiveOr,
  accentInsensitivePattern,
  shouldRunSearch,
} from "../../../src/lib/cms/accent-search";
import { missingContentOptions, parseMissingContent } from "../../../src/lib/cms/missing-content";

const matches = (term: string, text: string) =>
  new RegExp(accentInsensitivePattern(term), "i").test(text);

describe("Búsqueda del CMS sin acentos", () => {
  it("«tia» encuentra «Hotel Casa Tía Micha»", () => {
    expect(matches("tia", "Hotel Casa Tía Micha")).toBe(true);
  });
  it("«pina» encuentra «Piña Colada» y «meson» encuentra «Mesón»", () => {
    expect(matches("pina", "Piña Colada")).toBe(true);
    expect(matches("meson", "El Mesón del Marqués")).toBe(true);
  });
  it("un signo como el apóstrofe no rompe la búsqueda", () => {
    expect(matches("pak'al", "Pak'al Restaurante")).toBe(true);
    expect(accentInsensitivePattern("a,(b)")).not.toMatch(/[,()]/);
  });
  it("arma el filtro para nombre y dirección web", () => {
    expect(accentInsensitiveOr(["name", "slug"], "")).toBeNull();
    expect(accentInsensitiveOr(["name", "slug"], "su")).toBe(
      'name.imatch."s[uúùüûUÚÙÜÛ]",slug.imatch."s[uúùüûUÚÙÜÛ]"',
    );
  });
  it("busca mientras escribes a partir de 2 letras", () => {
    expect(shouldRunSearch("s")).toBe(false);
    expect(shouldRunSearch("su")).toBe(true);
    expect(shouldRunSearch("")).toBe(true);
  });
});

describe("Filtro «Le falta»", () => {
  it("empresas: foto, descripción, ubicación y barrio", () => {
    expect(missingContentOptions("businesses").map((o) => o.value)).toEqual([
      "photo",
      "description",
      "location",
      "zone",
    ]);
  });
  it("productos sólo foto y descripción; rechaza barrio", () => {
    expect(parseMissingContent("products", "zone")).toBeNull();
    expect(parseMissingContent("products", "photo")).toBe("photo");
  });
});
