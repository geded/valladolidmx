import { describe, expect, it } from "vitest";
import { isCacheablePageRequest, isSharedHtmlRequest, isStorableResponse } from "../../src/lib/server/public-page-cache";
const page = (path: string, extra: Record<string, string> = {}) =>
  new Request(`https://x.mx${path}`, { headers: { accept: "text/html", ...extra } });
describe("copia breve de páginas públicas", () => {
  it("guarda páginas públicas", () => {
    expect(isCacheablePageRequest(page("/"))).toBe(true);
    expect(isCacheablePageRequest(page("/oriente-maya/el-cuyo"))).toBe(true);
  });
  it("nunca guarda paneles, cuenta, pago ni vistas previas", () => {
    for (const p of ["/cms", "/portal/x", "/cuenta/mi-viaje", "/checkout/1", "/auth", "/api/public/x", "/?preview=1"])
      expect(isCacheablePageRequest(page(p))).toBe(false);
  });
  it("no guarda respuestas con cookie ni errores", () => {
    expect(isStorableResponse(new Response("x", { headers: { "content-type": "text/html", "set-cookie": "a=1" } }))).toBe(false);
    expect(isStorableResponse(new Response("x", { status: 500, headers: { "content-type": "text/html" } }))).toBe(false);
    expect(isStorableResponse(new Response("x", { headers: { "content-type": "text/html" } }))).toBe(true);
  });
  it("solo comparte Inicio y Valladolid sin sesión ni filtros", () => {
    expect(isSharedHtmlRequest(page("/"))).toBe(true);
    expect(isSharedHtmlRequest(page("/oriente-maya/valladolid"))).toBe(true);
    for (const path of ["/cms", "/?destino=izamal", "/oriente-maya/valladolid?presentacion=cinematografica"])
      expect(isSharedHtmlRequest(page(path))).toBe(false);
    expect(isSharedHtmlRequest(page("/", { cookie: "session=test" }))).toBe(false);
    expect(isSharedHtmlRequest(page("/", { authorization: "Bearer test" }))).toBe(false);
    expect(isSharedHtmlRequest(page("/", { "cache-control": "no-cache" }))).toBe(false);
  });
});
