import { describe, expect, it } from "vitest";
import { sitemapPaths, warmPlan, WARM_ALWAYS } from "@/lib/cache/page-warm";

describe("calentador de páginas", () => {
  it("lee las direcciones del mapa del sitio", () => {
    const xml = "<urlset><url><loc>https://x.com/</loc></url><url><loc>https://x.com/oriente-maya/valladolid/</loc></url></urlset>";
    expect(sitemapPaths(xml)).toEqual(["/", "/oriente-maya/valladolid"]);
  });
  it("siempre incluye las principales y rota el resto sin repetir", () => {
    const all = Array.from({ length: 10 }, (_, k) => `/p${k}`);
    const a = warmPlan(all, 0, 4);
    const b = warmPlan(all, 1, 4);
    expect(a.slice(0, WARM_ALWAYS.length)).toEqual(WARM_ALWAYS);
    expect(a.slice(WARM_ALWAYS.length)).toEqual(["/p0", "/p1", "/p2", "/p3"]);
    expect(b.slice(WARM_ALWAYS.length)).toEqual(["/p4", "/p5", "/p6", "/p7"]);
  });
});
