/**
 * Lazy Sonner Shim — H2·P3 · C1 (Lazy Toaster Spike)
 *
 * Fachada síncrona que evita que `sonner` viaje en el entry principal.
 * Todos los consumidores importan `toast` desde aquí en lugar de
 * `"sonner"`. El módulo real de sonner se carga bajo demanda cuando se
 * dispara el primer toast; hasta entonces no está en el grafo del
 * entry.
 *
 * Guardrails:
 *  - Cero pérdida del primer toast: el `ToastState` interno de sonner
 *    acumula los toasts emitidos antes de que el `<Toaster />` se
 *    monte, así que basta con esperar el `import()` dinámico y
 *    reenviar la llamada.
 *  - SSR-safe: el `import("sonner")` sólo se dispara al llamar a
 *    `toast(...)`, cosa que no ocurre en SSR.
 *  - Sin dependencia paralela: es únicamente una fachada. El sistema
 *    de notificaciones sigue siendo `sonner`.
 *  - Rollback: reemplazar los imports de `@/lib/toast` por `"sonner"`.
 */

type SonnerModule = typeof import("sonner");
type SonnerToast = SonnerModule["toast"];

let mod: SonnerModule | null = null;
let loading: Promise<SonnerModule> | null = null;
const mountListeners = new Set<() => void>();
let mountRequested = false;
let toasterReady = false;
const pending: Array<{ method: string | null; args: unknown[] }> = [];
const PENDING_MAX = 32;

function flushPending() {
  if (!mod || !toasterReady) return;
  const queue = pending.splice(0);
  for (const { method, args } of queue) {
    const target: any = method ? (mod.toast as any)[method] : mod.toast;
    try { target(...args); } catch { /* noop */ }
  }
}

/** Called by LazyToasterHost once <Toaster /> has mounted. */
export function markToasterReady() {
  toasterReady = true;
  // Give sonner a microtask to subscribe its internal listener.
  queueMicrotask(flushPending);
}

function requestMount() {
  if (mountRequested) return;
  mountRequested = true;
  mountListeners.forEach((l) => l());
}

export function subscribeToasterMount(cb: () => void): () => void {
  mountListeners.add(cb);
  if (mountRequested) cb();
  return () => mountListeners.delete(cb);
}

function loadSonner(): Promise<SonnerModule> {
  if (mod) return Promise.resolve(mod);
  if (!loading) {
    loading = import("sonner")
      .then((m) => {
        mod = m;
        return m;
      })
      .catch((err) => {
        // Allow a future call to retry the import; drop buffered
        // toasts so they don't leak forever if sonner never loads.
        loading = null;
        pending.length = 0;
        throw err;
      });
  }
  return loading;
}

function call(method: string | null, args: unknown[]): unknown {
  requestMount();
  if (mod && toasterReady) {
    const target: any = method ? (mod.toast as any)[method] : mod.toast;
    return target(...args);
  }
  // Buffer until <Toaster /> is mounted so the first toast isn't lost:
  // sonner drops toasts emitted before any Toaster has subscribed.
  pending.push({ method, args });
  if (pending.length > PENDING_MAX) pending.shift();
  void loadSonner().then(flushPending).catch(() => {});
  return undefined;
}

const methods = [
  "success",
  "error",
  "info",
  "warning",
  "message",
  "loading",
  "promise",
  "dismiss",
  "custom",
  "getHistory",
] as const;

type ToastFacade = SonnerToast;

const facade = ((...args: unknown[]) => call(null, args)) as unknown as ToastFacade;
for (const m of methods) {
  (facade as any)[m] = (...args: unknown[]) => call(m, args);
}

export const toast: ToastFacade = facade;

/** Permite precargar sonner en idle desde el shell. */
export function prefetchToaster(): Promise<unknown> {
  requestMount();
  return loadSonner();
}