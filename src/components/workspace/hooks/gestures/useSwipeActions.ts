import { useRef, type PointerEvent } from "react";

export interface SwipeActionsOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

/**
 * useSwipeActions — gestos horizontales sobre un elemento.
 * Devuelve handlers para spreading en JSX. Touch-first + pointer events.
 */
export function useSwipeActions({
  onSwipeLeft,
  onSwipeRight,
  threshold = 64,
}: SwipeActionsOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    startX.current = null;
    startY.current = null;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < threshold) return;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel: () => {
      startX.current = null;
      startY.current = null;
    },
    style: { touchAction: "pan-y" as const },
  };
}