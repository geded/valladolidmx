/**
 * launch-shell.ts — Arranque instantáneo de la app instalada.
 *
 * Al abrir la app desde la pantalla de inicio (ninguna ventana abierta), el
 * Service Worker entrega al instante la última copia guardada de la página,
 * como Airbnb, y la red la renueva en segundo plano. Sólo se usa si esa copia
 * pertenece a la versión publicada vigente (contiene el mismo `index-*.js`
 * precacheado), así nunca apunta a archivos retirados. Navegaciones dentro de
 * la app abierta y recargas siguen pidiendo la red primero.
 *
 * IMPORTANTE: workbox-build serializa estas funciones con `toString()`.
 * Deben ser autocontenidas: sólo globales del Service Worker (self, caches,
 * Response, URL), sin imports ni variables externas.
 */

type SwScope = {
  clients: { matchAll: (o: { type: string; includeUncontrolled: boolean }) => Promise<unknown[]> };
  navigator?: { onLine?: boolean };
};

export const launchShellCachedResponseWillBeUsed = async ({
  cachedResponse,
}: {
  cachedResponse?: Response | null;
}): Promise<Response | null> => {
  if (!cachedResponse) return null;
  try {
    const sw = self as unknown as SwScope;
    // Sin señal: la copia guardada se muestra de inmediato.
    if (sw.navigator && sw.navigator.onLine === false) return cachedResponse;
    // Con la app ya abierta (recarga o enlace interno): red primero.
    const open = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (open.length > 0) return null;
    const names = await caches.keys();
    const precache = names.find((n) => n.includes("precache"));
    if (!precache) return null;
    const keys = await (await caches.open(precache)).keys();
    const entry = keys
      .map((r) => new URL(r.url).pathname)
      .find((p) => /^\/assets\/index-[\w-]+\.js$/.test(p));
    if (!entry) return null;
    const html = await cachedResponse.clone().text();
    if (!html.includes(entry)) return null;
    // Las fotos protegidas llevan enlaces que caducan a las 2 h: con señal,
    // una copia de más de 45 min se pide nueva para no mostrar fotos vacías.
    const stamp = /data-rendered-at="(\d+)"/.exec(html);
    if (!stamp || Date.now() - Number(stamp[1]) > 45 * 60 * 1000) return null;
    return cachedResponse;
  } catch {
    return null;
  }
};

export const launchShellHandlerDidError = async ({
  request,
}: {
  request: Request;
}): Promise<Response> => {
  try {
    const copy = await (await caches.open("html-pages-v2")).match(request);
    if (copy) return copy;
  } catch {
    /* sigue al aviso sin conexión */
  }
  return (await caches.match("/offline.html", { ignoreSearch: true })) ?? Response.error();
};
