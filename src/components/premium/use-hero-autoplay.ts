import { useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Rotación automática compartida de los heros Premium (Home y Destino).
 * Respeta `prefers-reduced-motion` y no se activa con una sola fotografía.
 */
export function useHeroAutoplay(slides: number, setIndex: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    if (slides < 2 || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current: number) => (current + 1) % slides);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [setIndex, slides]);
}
