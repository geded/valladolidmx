import { afterEach, describe, expect, it, vi } from "vitest";
import { launchShellCachedResponseWillBeUsed, launchShellHandlerDidError } from "../../src/pwa/launch-shell";

const CURRENT = "/assets/index-abc123.js";

function setup({ windows = 0, online = true, precache = [CURRENT], htmlCache = null as Response | null }) {
  vi.stubGlobal("self", {
    clients: { matchAll: async () => Array.from({ length: windows }) },
    navigator: { onLine: online },
  });
  vi.stubGlobal("caches", {
    keys: async () => ["workbox-precache-v2-https://x/", "html-pages-v2"],
    open: async (name: string) => ({
      keys: async () => (name.includes("precache") ? precache.map((p) => new Request(`https://x${p}`)) : []),
      match: async () => (name === "html-pages-v2" ? htmlCache : undefined),
    }),
    match: async () => new Response("offline"),
  });
}

const page = (script: string, age = 0) =>
  new Response(`<html data-rendered-at="${Date.now() - age}"><script src="${script}"></script></html>`);

afterEach(() => vi.unstubAllGlobals());

describe("arranque instantáneo de la app instalada", () => {
  it("con señal no usa una copia de más de 45 minutos (fotos caducadas)", async () => {
    setup({});
    expect(await launchShellCachedResponseWillBeUsed({ cachedResponse: page(CURRENT, 46 * 60 * 1000) })).toBeNull();
  });

  it("sin señal sí usa una copia antigua", async () => {
    setup({ online: false });
    const copy = page(CURRENT, 5 * 60 * 60 * 1000);
    expect(await launchShellCachedResponseWillBeUsed({ cachedResponse: copy })).toBe(copy);
  });

  it("al abrir la app usa la copia guardada de la versión vigente", async () => {
    setup({});
    const copy = page(CURRENT);
    expect(await launchShellCachedResponseWillBeUsed({ cachedResponse: copy })).toBe(copy);
  });

  it("nunca usa una copia de una publicación anterior", async () => {
    setup({});
    expect(await launchShellCachedResponseWillBeUsed({ cachedResponse: page("/assets/index-old.js") })).toBeNull();
  });

  it("con la app ya abierta pide la página a la red", async () => {
    setup({ windows: 1 });
    expect(await launchShellCachedResponseWillBeUsed({ cachedResponse: page(CURRENT) })).toBeNull();
  });

  it("sin señal usa la copia guardada aunque haya ventanas abiertas", async () => {
    setup({ windows: 1, online: false });
    const copy = page("/assets/index-old.js");
    expect(await launchShellCachedResponseWillBeUsed({ cachedResponse: copy })).toBe(copy);
  });

  it("si la red falla muestra la copia guardada antes que el aviso sin conexión", async () => {
    const copy = page(CURRENT);
    setup({ htmlCache: copy });
    expect(await launchShellHandlerDidError({ request: new Request("https://x/") })).toBe(copy);
    setup({});
    expect(await (await launchShellHandlerDidError({ request: new Request("https://x/") })).text()).toBe("offline");
  });
});
