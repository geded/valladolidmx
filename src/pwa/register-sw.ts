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
  | "update-available"
  | "update-applied"
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
let currentRegistration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
let updateApplying = false;

/** Devuelve el registro activo del SW principal (o null). */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return currentRegistration;
}

/** Devuelve el worker en estado `waiting` (nueva versión lista). */
export function getWaitingServiceWorker(): ServiceWorker | null {
  return waitingWorker;
}

function setWaiting(worker: ServiceWorker | null): void {
  waitingWorker = worker;
  if (worker) emit("update-available", { state: worker.state });
}

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
      currentRegistration = reg;
      emit("registered", { scope: reg.scope });

      if (reg.installing) trackInstalling(reg.installing);
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        if (reg.installing) trackInstalling(reg.installing);
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        emit("controlling");
        if (updateApplying) {
          emit("update-applied");
          // Recarga controlada: única vía oficial de activar la nueva versión
          // sin dejar la sesión en estado mixto (Version Consistency).
          window.location.reload();
        }
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
      if (navigator.serviceWorker.controller) {
        emit("updated");
        setWaiting(worker);
      } else {
        emit("installed");
      }
    } else if (worker.state === "activated") {
      emit("activated");
    } else if (worker.state === "redundant") {
      emit("error", { phase: "install", message: "redundant" });
    }
  });
}

/**
 * Aplica la actualización pendiente enviando `SKIP_WAITING` al worker en
 * espera. Es el único mecanismo oficial de activación de una nueva
 * versión (Single Update Lifecycle · 15.10.6.5). La recarga ocurre en
 * `controllerchange` para garantizar consistencia entre HTML, assets,
 * Service Worker y recursos cacheados (Version Consistency).
 */
export async function applyPendingUpdate(): Promise<boolean> {
  const reason = { value: "" };
  if (isForbiddenContext(reason)) {
    emit("skipped", { reason: reason.value });
    return false;
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const reg = currentRegistration ?? (await navigator.serviceWorker.getRegistration());
  const target = waitingWorker ?? reg?.waiting ?? null;
  if (!target) return false;
  updateApplying = true;
  try {
    target.postMessage({ type: "SKIP_WAITING" });
    return true;
  } catch (err) {
    updateApplying = false;
    emit("error", { phase: "apply-update", message: (err as Error)?.message });
    return false;
  }
}

/**
 * Fuerza una comprobación de nueva versión (sin activarla). Útil para
 * chequeos periódicos o al recuperar visibilidad de la pestaña.
 */
export async function checkForUpdate(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const reg = currentRegistration ?? (await navigator.serviceWorker.getRegistration());
  if (!reg) return false;
  try {
    await reg.update();
    return true;
  } catch (err) {
    emit("error", { phase: "check-update", message: (err as Error)?.message });
    return false;
  }
}
