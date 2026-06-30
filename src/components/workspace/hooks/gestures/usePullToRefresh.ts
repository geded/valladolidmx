import { useEffect, useState } from "react";

export interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  ref: { current: HTMLElement | null };
}

export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  ref,
}: PullToRefreshOptions) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startY: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) setPull(Math.min(dy, threshold * 1.5));
    };
    const onTouchEnd = async () => {
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
      setPull(0);
      startY = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, onRefresh, threshold, pull, refreshing]);

  return { pull, refreshing };
}