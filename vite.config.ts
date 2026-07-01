// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          // Offline fallback: rutas navegacionales sin caché caen a /offline
          // (precacheado). El shell público sigue disponible offline si ya se
          // visitó; el resto muestra un estado offline controlado.
          navigateFallback: "/offline",
          navigateFallbackDenylist: [
            /^\/~oauth/,
            /^\/api\//,
            /^\/auth/,
            /^\/cms/,
            /^\/portal/,
            /^\/admin/,
            /^\/cuenta/,
            /^\/concierge/,
            /^\/empresa/,
          ],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          runtimeCaching: [
            // Rutas sensibles / autenticadas: NUNCA cachear.
            // Se resuelve siempre contra red; sin fallback offline.
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin &&
                /^\/(?:~oauth|api|auth|cms|portal|admin|cuenta|concierge|empresa)(?:\/|$)/.test(
                  url.pathname,
                ),
              handler: "NetworkOnly",
              options: { cacheName: "no-store-sensitive" },
            },
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                !/^\/(?:~oauth|api|auth|cms|portal|admin|cuenta|concierge|empresa)(?:\/|$)/.test(
                  url.pathname,
                ),
              handler: "NetworkFirst",
              options: {
                cacheName: "html-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
