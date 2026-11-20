import { useEffect, useRef, useState } from "react";

export interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  /** Contenedor que recibe el gesto; `document.documentElement` usa el scroll de la ventana. */
  ref: { current: HTMLElement | null };
  /** Permite desactivar el gesto sin desmontar al consumidor. */
  enabled?: boolean;
  /** Filtro opcional: devuelve `false` para ignorar un toque (diálogos, mapas, carruseles). */
  canStart?: (event: TouchEvent) => boolean;
}

function scrollOffset(el: HTMLElement): number {
  if (typeof document !== "undefined" && el === document.documentElement) {
    return window.scrollY || el.scrollTop || 0;
  }
  return el.scrollTop;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  ref,
  enabled = true,
  canStart,
}: PullToRefreshOptions) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const latest = useRef({ onRefresh, canStart, threshold });
  latest.current = { onRefresh, canStart, threshold };

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let startX: number | null = null;
    let startY: number | null = null;
    let tracking = false;

    const update = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };

    const onTouchStart = (e: TouchEvent) => {
      tracking = false;
      startX = null;
      startY = null;
      if (refreshingRef.current || e.touches.length !== 1) return;
      if (scrollOffset(el) > 0) return;
      if (latest.current.canStart && !latest.current.canStart(e)) return;
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY == null || startX == null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY;
      const dx = touch.clientX - startX;
      if (!tracking) {
        /* Deslizar de lado (galerías) o hacia arriba cancela el gesto. */
        if (Math.abs(dx) > Math.abs(dy) || dy <= 0 || scrollOffset(el) > 0) {
          if (Math.abs(dx) > 8 || dy < -8) startY = null;
          return;
        }
        tracking = true;
      }
      /* Resistencia suave, como el gesto nativo. */
      update(Math.max(0, Math.min(dy * 0.5, latest.current.threshold * 1.5)));
    };
    const onTouchEnd = async () => {
      const reached = tracking && pullRef.current >= latest.current.threshold;
      tracking = false;
      startX = null;
      startY = null;
      update(0);
      if (!reached || refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await latest.current.onRefresh();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [ref, enabled]);

  return { pull, refreshing };
}
