import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rows = new Map<string, { value: unknown; refreshed_at: string }>();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({
    select: () => ({ eq: (_column: string, key: string) => ({
      maybeSingle: async () => ({ data: rows.get(key) ?? null }),
    }) }),
    upsert: async (row: { key: string; value: unknown; refreshed_at: string }) => {
      rows.set(row.key, row);
    },
  }) },
}));
import { __resetPublicReadMemo } from "@/lib/cache/public-read-memo";
import { isForcedHtmlRefresh, serveSharedHtml, serveStaleSharedHtml } from "@/lib/server/public-page-cache";

const request = (path = "/", headers: Record<string, string> = {}) =>
  new Request(`https://site.test${path}`, { headers: { accept: "text/html", ...headers } });
const html = (body: string) => new Response(body, { headers: { "content-type": "text/html" } });

describe("HTML público reutilizado", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); rows.clear(); __resetPublicReadMemo(); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  it("reutiliza el documento completo también desde la copia compartida", async () => {
    const render = vi.fn(async () => html("<h1>Valladolid</h1><img src='foto'/>"));
    const first = await serveSharedHtml(request(), render);
    const body = await first.text();
    __resetPublicReadMemo();
    const second = await serveSharedHtml(request(), render);
    expect(await second.text()).toBe(body);
    expect(second.headers.get("x-vmx-html")).toBe("HIT");
    expect(second.headers.get("cache-control")).toBe("no-store");
    expect(render).toHaveBeenCalledTimes(1);
  });
  it("compacta solo lo guardado y devuelve intactos UTF-8, NUL y HTML sin doble compresión", async () => {
    const body = "Valladolid · café · 🌴\0".repeat(1000);
    const response = await serveSharedHtml(request(), async () => html(body));
    expect(await response.text()).toBe(body);
    expect(response.headers.has("content-encoding")).toBe(false);
    expect(response.headers.get("server-timing")).toContain("vmx_html;dur=");
    const stored = [...rows.values()].find((row) => row.value !== null);
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored?.value).length).toBeLessThan(body.length / 4);
    __resetPublicReadMemo();
    expect(await (await serveSharedHtml(request(), async () => html("wrong"))).text()).toBe(body);
  });
  it("al armar en la misma petición no reutiliza HTML de más de 60 segundos", async () => {
    const render = vi.fn(async () => html(`foto-${Date.now()}`));
    await serveSharedHtml(request(), render);
    vi.setSystemTime(1_060_001);
    const second = await serveSharedHtml(request(), render);
    expect(await second.text()).toBe("foto-1060001");
    expect(render).toHaveBeenCalledTimes(2);
  });
  it("un cambio del CMS descarta el HTML anterior", async () => {
    await serveSharedHtml(request(), async () => html("foto-vieja"));
    rows.clear();
    rows.set("__cms_changed__", { value: null, refreshed_at: new Date(1_009_000).toISOString() });
    vi.setSystemTime(1_010_000);
    const fresh = await serveSharedHtml(request(), async () => html("foto-nueva"));
    expect(await fresh.text()).toBe("foto-nueva");
    expect(fresh.headers.get("x-vmx-html")).toBe("MISS");
  });
  it("una publicación nueva no recibe HTML con archivos de la anterior", async () => {
    vi.stubEnv("VMX_HTML_BUILD_ID", "first");
    await serveSharedHtml(request(), async () => html("chunk-first"));
    vi.stubEnv("VMX_HTML_BUILD_ID", "second");
    const fresh = await serveSharedHtml(request(), async () => html("chunk-second"));
    expect(await fresh.text()).toBe("chunk-second");
  });
  it("no mezcla dominios ni guarda respuestas privadas o errores", async () => {
    await serveSharedHtml(request(), async () => html("site-one"));
    const other = await serveSharedHtml(new Request("https://other.test/", { headers: { accept: "text/html" } }), async () => html("site-two"));
    expect(await other.text()).toBe("site-two");
    for (const headers of [{ "set-cookie": "test=1" }, { "cache-control": "private" }, { vary: "Cookie" }]) {
      __resetPublicReadMemo(); rows.clear();
      const render = vi.fn(async () => new Response("private", { headers: { "content-type": "text/html", ...headers } }));
      await serveSharedHtml(request(), render);
      await serveSharedHtml(request(), render);
      expect(render).toHaveBeenCalledTimes(2);
    }
    __resetPublicReadMemo(); rows.clear();
    expect((await serveSharedHtml(request(), async () => new Response("error", { status: 403 }))).status).toBe(403);
    expect(rows.size).toBe(0);
  });
});
import { hasOnlyProviderCookies as onlyProvider } from "../../src/lib/server/public-page-cache";
import { test as t2, expect as e2 } from "vitest";
t2("la cookie antirrobots del proveedor no cuenta como sesión", () => {
  e2(onlyProvider("__cf_bm=abc; _cfuvid=x")).toBe(true);
  e2(onlyProvider("__cf_bm=abc; sb-access=1")).toBe(false);
});

describe("HTML público · copia al instante con renovación detrás", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); rows.clear(); __resetPublicReadMemo(); });
  afterEach(() => { vi.useRealTimers(); });
    const ctx = () => {
      const pending: Promise<unknown>[] = [];
      return { pending, waitUntil: (p: Promise<unknown>) => { pending.push(p); } };
    };
    it("entrega al instante una copia de 90 s y la renueva en segundo plano", async () => {
      await serveSharedHtml(request(), async () => html("foto-vieja"));
      vi.setSystemTime(1_090_000);
      const c = ctx();
      const refresh = vi.fn(async (r: Request) =>
        serveSharedHtml(r, async () => html("foto-nueva")));
      const out = await serveStaleSharedHtml(request(), c, refresh);
      expect(await out?.text()).toBe("foto-vieja");
      expect(out?.headers.get("x-vmx-html")).toBe("STALE");
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(isForcedHtmlRefresh(refresh.mock.calls[0]![0])).toBe(true);
      await Promise.all(c.pending);
      const next = await serveStaleSharedHtml(request(), ctx(), refresh);
      expect(await next?.text()).toBe("foto-nueva");
      expect(next?.headers.get("x-vmx-html")).toBe("HIT");
    });
    it("no entrega copias de más de 10 minutos", async () => {
      await serveSharedHtml(request(), async () => html("vieja"));
      vi.setSystemTime(1_000_000 + 10 * 60_000 + 1);
      expect(await serveStaleSharedHtml(request(), ctx(), vi.fn())).toBeNull();
    });
    it("un cambio del CMS impide entregar la copia anterior", async () => {
      await serveSharedHtml(request(), async () => html("vieja"));
      __resetPublicReadMemo();
      rows.set("__cms_changed__", { value: null, refreshed_at: new Date(1_009_000).toISOString() });
      vi.setSystemTime(1_010_000);
      expect(await serveStaleSharedHtml(request(), ctx(), vi.fn())).toBeNull();
    });
    it("un visitante no puede forzar que se vuelva a armar", async () => {
      expect(isForcedHtmlRefresh(request("/", { "x-vmx-html-refresh": "x" }))).toBe(false);
    });
});
