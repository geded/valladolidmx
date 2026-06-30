import { useRef, type PointerEvent } from "react";

export function useLongPress(
  onLongPress: () => void,
  { delay = 500 }: { delay?: number } = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return {
    onPointerDown: (_e: PointerEvent) => {
      clear();
      timer.current = setTimeout(onLongPress, delay);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}