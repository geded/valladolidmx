/**
 * Sticky CTA Presence — canal ligero para coordinar Alux flotante con
 * cualquier CTA sticky comercial (ExperienceCtaBar, futuras barras).
 * SSR-safe. Sin dependencias externas.
 */
import { useSyncExternalStore } from "react";

let count = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function registerStickyCta(): () => void {
  count += 1;
  emit();
  return () => {
    count = Math.max(0, count - 1);
    emit();
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return count;
}

function getServerSnapshot() {
  return 0;
}

export function useHasStickyCta(): boolean {
  const n = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return n > 0;
}