// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      VitePWA({
        // Verificado 2026-09-13: el bundle cliente publicado queda en
        // `dist/client` (assets, og, favicon). `.output/public` sólo recibía
        // el propio sw.js, por lo que el Service Worker no se servía y el
        // precache quedaba vacío. Este destino es el que realmente se publica.
        outDir: "dist/client",
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          // La versión nueva toma control en cuanto termina de instalarse.
          // Evita que Safari móvil conserve HTML que apunta a assets retirados.
          skipWaiting: true,
          // IMPORTANTE (2026-09-14): NO usar `navigateFallback`.
          // Workbox registra la NavigationRoute ANTES que `runtimeCaching`,
          // por lo que atendía TODA navegación pública con `/offline.html`
          // precacheado aunque hubiera red. El visitante veía "Estás sin
          // conexión" unos segundos y luego la autorreparación de esa página
          // recargaba el sitio. El fallback offline ahora vive dentro de la
          // ruta NetworkFirst de navegación y sólo actúa si la red falla.
          // El valor por defecto del plugin ("index.html") debe anularse.
          navigateFallback: undefined,



          // Sólo el cascarón público estable. Los chunks de rutas, CMS,
          // administración y sesiones se solicitan bajo demanda y nunca se
          // incorporan indiscriminadamente al precache.
          globPatterns: [
            "favicon.ico",
            "logo.png",
            "og/default-1200x630.jpg",
            "assets/{index,client,styles,PublicShell,HomePremiumSurface}-*.*",
          ],
          // La revisión cambia en cada build para reemplazar de inmediato
          // cualquier fallback anterior que haya quedado en Safari móvil.
          additionalManifestEntries: [
            { url: "/offline.html", revision: `pwa-offline-${Date.now().toString(36)}` },
          ],
          runtimeCaching: [
            // Rutas sensibles / autenticadas: NUNCA cachear.
            // Se resuelve siempre contra red; sin fallback offline.
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin &&
                // Las fotos públicas servidas por el pipeline de medios no son
                // datos sensibles: se dejan fuera para que puedan guardarse y
                // verse sin conexión (regla de imágenes más abajo).
                !url.pathname.startsWith("/api/public/studio-media/") &&
                /^\/(?:~oauth|api|auth|cms|portal|admin|cuenta|concierge|empresa)(?:\/|$)/.test(
                  url.pathname,
                ),
              handler: "NetworkOnly",
              options: {
                cacheName: "no-store-sensitive",
                // 2026-09-21 · Offline First: estas rutas siguen sin cachearse
                // (Security Before Offline). Lo único que cambia es que una
                // navegación sin red muestra la pantalla oficial "Sin conexión"
                // en vez del error crudo del navegador. Nunca guarda datos.
                plugins: [
                  {
                    handlerDidError: async ({ request }) =>
                      request?.mode === "navigate"
                        ? ((await caches.match("/offline.html", { ignoreSearch: true })) ??
                          Response.error())
                        : Response.error(),
                  },
                ],
              },
            },
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                !/^\/(?:~oauth|api|auth|cms|portal|admin|cuenta|concierge|empresa)(?:\/|$)/.test(
                  url.pathname,
                ),
              handler: "NetworkFirst",
              options: {
                // v2: purga cachés de navegación envenenadas con la pantalla
                // "Estás sin conexión" de builds anteriores.
                cacheName: "html-pages-v2",
                /* Sin timeout corto: con 4 s, una respuesta SSR algo lenta
                   se interpretaba como "sin red" y el visitante veía un
                   parpadeo de la pantalla "Estás sin conexión" antes de que
                   cargara la categoría. El fallback offline debe activarse
                   sólo cuando la red realmente falla. */
                networkTimeoutSeconds: 20,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
                // Único punto donde puede aparecer la pantalla sin conexión:
                // cuando red y caché fallan de verdad.
                plugins: [
                  {
                    handlerDidError: async () =>
                      (await caches.match("/offline.html", { ignoreSearch: true })) ??
                      Response.error(),
                  },
                ],
              },
            },

            // 2026-09-21 · Offline First. Las navegaciones dentro de la app
            // (TanStack Router) no piden HTML: resuelven sus loaders contra
            // `/_serverFn/...` por GET. Sin esta ruta, al perder la red una
            // página ya visitada fallaba y el visitante terminaba en la
            // pantalla "Sin conexión". Sólo GET de lectura pública; las rutas
            // sensibles siguen en NetworkOnly y nada autenticado se almacena.
            {
              urlPattern: ({ url, sameOrigin, request }) =>
                sameOrigin &&
                request.method === "GET" &&
                url.pathname.startsWith("/_serverFn/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "server-data-v1",
                networkTimeoutSeconds: 12,
                expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            },

            // Los archivos construidos llevan hash en el nombre y no contienen
            // datos ni sesiones. Guardarlos permite reabrir offline una página
            // pública ya visitada sin mezclar archivos de versiones distintas.
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin &&
                /^\/assets\/.+-[A-Za-z0-9_-]+\.(?:js|css|woff2?)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "built-assets-v1",
                expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static-images",
                expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            // Google Fonts stylesheet — SWR: rápido y siempre revalidado.
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "google-fonts-stylesheets" },
            },
            // Google Fonts webfont files — CacheFirst con TTL largo.
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
