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
    loading = import("sonner").then((m) => {
      mod = m;
      return m;
    });
  }
  return loading;
}

function call(method: string | null, args: unknown[]): unknown {
  requestMount();
  if (mod) {
    const target: any = method ? (mod.toast as any)[method] : mod.toast;
    return target(...args);
  }
  // Kick off the load and forward once ready. Sonner's global ToastState
  // subscribers list is shared, so a late-mounted <Toaster /> still picks
  // up any toast we enqueue here.
  void loadSonner().then((m) => {
    const target: any = method ? (m.toast as any)[method] : m.toast;
    target(...args);
  });
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

// H2·P3 · C1 protocol probe. Attach a window handle only when the URL
// carries `?__c1_probe=1` so the §4 functional protocol can drive the
// lazy shim from an automated browser without shipping a debug API to
// real users. Zero cost otherwise.
if (typeof window !== "undefined") {
  try {
    if (new URLSearchParams(window.location.search).has("__c1_probe")) {
      (window as unknown as Record<string, unknown>).__lvToast = toast;
      (window as unknown as Record<string, unknown>).__lvPrefetchToaster =
        prefetchToaster;
    }
  } catch {
    /* noop */
  }
}