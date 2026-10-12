import { describe, expect, it } from "vitest";
import { isBusinessMatch } from "../../src/lib/cms/business-match";

describe("detector de empresas existentes", () => {
  it("encuentra el mismo hotel con palabras invertidas", () => {
    expect(isBusinessMatch("Sutuk Hotel", "Hotel Sutuk", "hotel-sutuk")).toBe(true);
  });
  it("ignora acentos y mayúsculas", () => {
    expect(isBusinessMatch("casa tia micha", "Hotel Casa Tía Micha")).toBe(true);
  });
  it("encuentra por dirección web pegada", () => {
    expect(isBusinessMatch("Meson", "Hotel El Mesón del Marqués", "mesondelmarques")).toBe(true);
  });
  it("no sugiere nada con menos de 3 letras", () => {
    expect(isBusinessMatch("Ho", "Hotel Sutuk")).toBe(false);
  });
  it("no confunde hoteles distintos por la palabra Hotel", () => {
    expect(isBusinessMatch("Hotel Bernardino", "Hotel Sutuk", "hotel-sutuk")).toBe(false);
  });
});
