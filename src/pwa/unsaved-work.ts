/**
 * unsaved-work.ts — Señal mínima de «trabajo sin guardar» para el ciclo de
 * actualización de la PWA.
 *
 * Los formularios del CMS avisan aquí cuando el editor tiene cambios que aún
 * no llegaron al servidor. Mientras exista alguno, la nueva versión de la app
 * no se activa sola (activarla recarga la página y desmonta el formulario);
 * queda disponible en el aviso «Nueva versión disponible» y se aplica sola en
 * cuanto ya no haya cambios pendientes y la app pase a segundo plano.
 */

const pending = new Set<string>();

export const UNSAVED_WORK_EVENT = "vmx:unsaved-work-change" as const;
/** Pide a todos los formularios que guarden su respaldo local en este instante. */
export const FLUSH_DRAFTS_EVENT = "vmx:cms-flush-drafts" as const;

export function setUnsavedWork(id: string, unsaved: boolean): void {
  const had = pending.has(id);
  if (unsaved) pending.add(id);
  else pending.delete(id);
  if (had === unsaved || typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(UNSAVED_WORK_EVENT, { detail: { count: pending.size } }));
  } catch {
    /* noop */
  }
}

export function hasUnsavedWork(): boolean {
  return pending.size > 0;
}

export function requestDraftFlush(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(FLUSH_DRAFTS_EVENT));
  } catch {
    /* noop */
  }
}
