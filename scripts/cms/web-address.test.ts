import { describe, expect, it } from "vitest";
import { webAddressProblem } from "../../src/lib/cms/web-address";

describe("Dirección web del CMS", () => {
  it("rechaza un enlace completo pegado como dirección web", () => {
    expect(webAddressProblem("https://www.yucatan.gob.mx/?p=cuyo")).toMatch(/enlace completo/);
  });
  it("rechaza espacios y signos", () => {
    expect(webAddressProblem("el cuyo")).toMatch(/minúsculas/);
    expect(webAddressProblem("cuyo?x=1")).not.toBeNull();
  });
  it("acepta una dirección normal", () => {
    expect(webAddressProblem("el-cuyo")).toBeNull();
  });
  it("sigue aceptando direcciones antiguas con guion bajo", () => {
    expect(webAddressProblem("garden_hotel")).toBeNull();
  });
  it("deja pasar el campo vacío (el alta de empresa la genera sola)", () => {
    expect(webAddressProblem("")).toBeNull();
    expect(webAddressProblem(null)).toBeNull();
  });
});
