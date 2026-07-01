/**
 * pwa-skipwaiting.js — Adenda 15.10.6.5 · Update Lifecycle.
 *
 * Único mecanismo oficial de activación de una nueva versión del
 * Service Worker generado por vite-plugin-pwa (workbox skipWaiting:
 * false). El cliente envía `{ type: "SKIP_WAITING" }` desde
 * `applyPendingUpdate()` (src/pwa/register-sw.ts) y este listener
 * promueve al worker en espera a activo. La recarga posterior en
 * `controllerchange` garantiza Version Consistency.
 */
self.addEventListener("message", (event) => {
  const data = event && event.data;
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});