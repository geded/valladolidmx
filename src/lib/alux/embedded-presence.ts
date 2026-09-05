/**
 * Presencia embebida de Alux (Lote 3G).
 *
 * Evita que el disparador flotante de Alux se superponga a un módulo de
 * Alux ya visible dentro del contenido. NO cambia la lógica funcional del
 * flotante ni del módulo embebido: sólo publica una señal de visibilidad.
 *
 * Un módulo embebido llama `useRegisterAluxEmbedded(ref)`; mientras ese
 * módulo esté en pantalla, `useAluxEmbeddedVisible()` devuelve `true` y el
 * flotante se retira (sin desmontar su lógica).
 *
 * SSR-safe: sin `window` durante el render del servidor.
 */
import { useEffect, useSyncExternalStore, type RefObject } from "react";

let visibleCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Marca/desmarca una instancia embebida como visible. */
export function setAluxEmbeddedVisible(visible: boolean): () => void {
  if (!visible) return () => {};
  visibleCount += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    visibleCount = Math.max(0, visibleCount - 1);
    emit();
  };
}

export function aluxEmbeddedVisibleCount(): number {
  return visibleCount;
}

/** Sólo para pruebas: reinicia el contador y los suscriptores. */
export function __resetAluxEmbeddedPresenceForTests(): void {
  visibleCount = 0;
  listeners.clear();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `true` mientras haya al menos un módulo de Alux embebido en pantalla. */
export function useAluxEmbeddedVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => visibleCount > 0,
    () => false,
  );
}

/**
 * Publica la visibilidad del módulo embebido referenciado. Si el navegador
 * no soporta `IntersectionObserver`, no publica nada (el flotante se
 * comporta como hoy).
 */
export function useRegisterAluxEmbedded(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    let release: (() => void) | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((e) => e.isIntersecting);
        if (isVisible && !release) {
          release = setAluxEmbeddedVisible(true);
        } else if (!isVisible && release) {
          release();
          release = null;
        }
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.15 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      release?.();
      release = null;
    };
  }, [ref]);
}
