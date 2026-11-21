/**
 * Paradas «hechas» del itinerario — sólo en este teléfono.
 *
 * El viajero marca cada parada al vivirla. Se guarda localmente por viaje
 * (funciona sin señal y no toca reservas, pagos ni el expediente del
 * concierge). Sólo almacena identificadores de paradas.
 */
import { useCallback, useSyncExternalStore } from "react";

export const ITINERARY_PROGRESS_PREFIX = "vmx.itinerary-progress.v1:";
const CHANGE_EVENT = "vmx:itinerary-progress";
const MAX_IDS = 400;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function progressKey(planId: string): string {
  return `${ITINERARY_PROGRESS_PREFIX}${planId}`;
}

export function parseProgress(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { done?: unknown };
    if (!Array.isArray(parsed.done)) return [];
    return parsed.done.filter((v): v is string => typeof v === "string").slice(0, MAX_IDS);
  } catch {
    return [];
  }
}

export function readProgress(planId: string, store: StorageLike | null = storage()): string[] {
  return parseProgress(store?.getItem(progressKey(planId)) ?? null);
}

export function toggleProgress(
  planId: string,
  stopId: string,
  store: StorageLike | null = storage(),
): string[] {
  const current = new Set(readProgress(planId, store));
  if (current.has(stopId)) current.delete(stopId);
  else current.add(stopId);
  const done = [...current].slice(0, MAX_IDS);
  try {
    if (done.length === 0) store?.removeItem(progressKey(planId));
    else store?.setItem(progressKey(planId), JSON.stringify({ done, updatedAt: Date.now() }));
  } catch {
    /* almacenamiento lleno o bloqueado: la marca vive sólo en pantalla */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { planId } }));
  }
  return done;
}

const EMPTY: readonly string[] = Object.freeze([]);
const cache = new Map<string, { raw: string | null; value: readonly string[] }>();

function snapshot(planId: string): readonly string[] {
  const raw = storage()?.getItem(progressKey(planId)) ?? null;
  const hit = cache.get(planId);
  if (hit && hit.raw === raw) return hit.value;
  const value = raw ? parseProgress(raw) : EMPTY;
  cache.set(planId, { raw, value });
  return value;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Paradas hechas del viaje y acción para marcar/desmarcar. */
export function useItineraryProgress(planId: string): {
  done: ReadonlySet<string>;
  toggle: (stopId: string) => void;
} {
  const list = useSyncExternalStore(
    subscribe,
    () => snapshot(planId),
    () => EMPTY,
  );
  const toggle = useCallback((stopId: string) => void toggleProgress(planId, stopId), [planId]);
  return { done: new Set(list), toggle };
}
