/**
 * register-sw.ts — Wrapper INERTE de Service Worker para Fase 0.
 *
 * Propósito: dejar preparado el punto de registro del Service Worker para
 * fases futuras (offline, push, sincronización). En Fase 0 NO se registra
 * nada y se desregistra cualquier SW previo en contextos de preview/dev
 * (PWA skill compliance).
 *
 * Responsabilidades:
 *  - Mantener un único punto de entrada para el SW.
 *  - Garantizar que jamás se registre en preview/iframe/dev de Lovable.
 *  - Desregistrar SWs huérfanos durante Fase 0.
 *
 * Dependencias: ninguna (cliente puro).
 */

export const SW_PATH = "/sw.js" as const;

function isForbiddenContext(): boolean {
  if (typeof window === "undefined") return true;
  if (window.top !== window.self) return true;
  const { hostname, search } = window.location;
  if (search.includes("sw=off")) return true;
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterStale(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => r.active?.scriptURL?.endsWith(SW_PATH))
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

/** Llamado desde __root.tsx. Fase 0: sólo limpia registros huérfanos. */
export async function registerServiceWorker(): Promise<void> {
  if (isForbiddenContext()) {
    await unregisterStale();
    return;
  }
  await unregisterStale();
}
