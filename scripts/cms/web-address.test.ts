import { describe, expect, it } from "vitest";
import { webAddressProblem } from "../../src/lib/cms/web-address";

describe("Dirección web del CMS", () => {
  it("rechaza un enlace completo pegado como dirección web", () => {
    expect(webAddressProblem("https://www.yucatan.gob.mx/?p=cuyo")).toMatch(/enlace/);
  });
  it("rechaza una página de internet escrita sin https", () => {
    expect(webAddressProblem("www.valladolid.mx")).toMatch(/enlace/);
    expect(webAddressProblem("valladolid.mx")).toMatch(/enlace/);
  });
  it("rechaza guion bajo, espacios y signos porque esas páginas no abren", () => {
    expect(webAddressProblem("casona_cedros")).toMatch(/guion bajo/);
    expect(webAddressProblem("el cuyo")).not.toBeNull();
    expect(webAddressProblem("cuyo?x=1")).not.toBeNull();
  });
  it("acepta una dirección normal", () => {
    expect(webAddressProblem("el-cuyo")).toBeNull();
    expect(webAddressProblem("posada-san-jose")).toBeNull();
  });
  it("deja pasar el campo vacío (el alta de empresa la genera sola)", () => {
    expect(webAddressProblem("")).toBeNull();
    expect(webAddressProblem(null)).toBeNull();
  });
});
