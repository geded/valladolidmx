/**
 * push-sw.js — Adenda 15.10.6.4 · Push Notifications
 *
 * Service Worker dedicado a mensajería push. Vive en scope acotado
 * ("/push/") para NO colisionar con el SW de app-shell generado por
 * vite-plugin-pwa en "/". No cachea, no hace fetch handling; sólo
 * recibe eventos `push` y `notificationclick`.
 *
 * Gobernanza 15.10.6.4:
 *  - Ningún payload sensible (pagos, auth, roles, tokens, billing) se
 *    procesa; sólo notificaciones informativas.
 *  - Kill switch: si el cliente desregistra este SW, cesan las
 *    notificaciones inmediatamente.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Valladolid.mx", body: event.data ? event.data.text() : "" };
  }
  const title = String(data.title || "Valladolid.mx");
  const options = {
    body: String(data.body || ""),
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || undefined,
    data: {
      url: typeof data.url === "string" ? data.url : "/",
      ts: Date.now(),
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) await client.navigate(target);
            return;
          }
        } catch {
          /* noop */
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});