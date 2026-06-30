/**
 * register-sw.ts — Adenda 15.10.6.1 · Service Worker Base + Installability
 *
 * Wrapper único y guardado para registrar el Service Worker generado por
 * vite-plugin-pwa (generateSW). Cumple la PWA skill:
 *  - Jamás registra en dev, iframe, preview Lovable, o cuando `?sw=off`.
 *  - Desregistra SWs huérfanos en esos contextos (kill-switch).
 *  - Sólo registra `/sw.js` en producción real (build + dominio público).
 *  - `autoUpdate` + actualización segura: prompt no requerido — la nueva
 *    versión se activa con `skipWaiting:false` controlado por workbox.
 *  - Emite eventos de observabilidad (install, activate, update, error).
 *
 * Principios de gobernanza 15.10.6:
 *  - Offline is Progressive: cualquier fallo en el registro es no crítico.
 *  - Security Before Offline: no se cachean sesiones, tokens ni rutas
 *    autenticadas; configurado en vite.config.ts.
 *  - Update Safety: usuario nunca queda atrapado en versión vieja.
 *  - Observability First: cada paso emite un `pwa:*` CustomEvent.
 */

export const SW_PATH = "/sw.js" as const;

type PwaEvent =
  | "skipped"
  | "registered"
  | "installed"
  | "activated"
  | "updated"
  | "controlling"
  | "error"
  | "unregistered";

function emit(event: PwaEvent, detail?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(`pwa:${event}`, { detail }));
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(`[pwa] ${event}`, detail ?? {});
    }
  } catch {
    /* noop */
  }
}

function isForbiddenContext(reason?: { value: string }): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) {
    if (reason) reason.value = "unsupported";
    return true;
  }
  if (!import.meta.env.PROD) {
    if (reason) reason.value = "dev";
    return true;
  }
  if (window.top !== window.self) {
    if (reason) reason.value = "iframe";
    return true;
  }
  const { hostname, search } = window.location;
  if (search.includes("sw=off")) {
    if (reason) reason.value = "kill-switch";
    return true;
  }
  const blocked =
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");
  if (blocked && reason) reason.value = "lovable-preview";
  return blocked;
}

async function unregisterStale(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const toRemove = regs.filter((r) =>
      (r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "").endsWith(
        SW_PATH,
      ),
    );
    if (toRemove.length === 0) return;
    await Promise.allSettled(toRemove.map((r) => r.unregister()));
    emit("unregistered", { count: toRemove.length });
  } catch (err) {
    emit("error", { phase: "unregister", message: (err as Error)?.message });
  }
}

let registrationPromise: Promise<void> | null = null;

export function registerServiceWorker(): Promise<void> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    const reason = { value: "" };
    if (isForbiddenContext(reason)) {
      emit("skipped", { reason: reason.value });
      await unregisterStale();
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      emit("registered", { scope: reg.scope });

      if (reg.installing) trackInstalling(reg.installing);
      reg.addEventListener("updatefound", () => {
        if (reg.installing) trackInstalling(reg.installing);
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        emit("controlling");
      });
    } catch (err) {
      emit("error", { phase: "register", message: (err as Error)?.message });
    }
  })();
  return registrationPromise;
}

function trackInstalling(worker: ServiceWorker): void {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed") {
      emit(navigator.serviceWorker.controller ? "updated" : "installed");
    } else if (worker.state === "activated") {
      emit("activated");
    } else if (worker.state === "redundant") {
      emit("error", { phase: "install", message: "redundant" });
    }
  });
}
