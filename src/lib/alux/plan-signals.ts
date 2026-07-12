/**
 * Ola A15 · Señal `plan_updated` — Bus de cambio de plan.
 *
 * Cualquier mutación del Travel Plan (agregar/quitar item, editar metadatos,
 * importar favoritos) llama a `notifyPlanChanged()`. Esto:
 *  1) Emite un `CustomEvent("alux:plan-changed")` — el flotante lo escucha
 *     con `onPlanChanged()` para refrescar su snapshot inmediatamente sin
 *     esperar al staleTime del query.
 *  2) Reporta la señal pública `plan_updated` a la memoria M3 del concierge
 *     (si existe una sesión pública activa en este navegador).
 *
 * Fire-and-forget, silencioso. No bloquea la UI.
 */
import { logAluxPublicSignal } from "./public-signals";

const EVENT = "alux:plan-changed";

export function notifyPlanChanged(reason?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason } }));
  } catch {
    /* noop */
  }
  try {
    logAluxPublicSignal({
      action: "plan_updated",
      label: reason ?? "plan actualizado",
    });
  } catch {
    /* noop */
  }
}

export function onPlanChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = () => handler();
  window.addEventListener(EVENT, listener as EventListener);
  return () => window.removeEventListener(EVENT, listener as EventListener);
}