import { useEffect, useRef, useState } from "react";
import {
  acquireEditLock,
  heartbeatEditLock,
  releaseEditLock,
  type EditingLock,
} from "@/lib/experience-builder/studio.functions";

export interface UseEditingLockState {
  /** Lock currently held by someone else — read-only mode. */
  blockedBy: EditingLock | null;
  /** Lock is ours — safe to edit. */
  owned: boolean;
  /** True while trying to acquire the lock the first time. */
  loading: boolean;
  /** Force takeover (admin only). */
  forceAcquire: () => Promise<void>;
  /** Manually retry. */
  refresh: () => Promise<void>;
}

/**
 * US-01 · Soft lock. Attempts to acquire the edit lock on mount, sends a
 * heartbeat every 30s, and releases the lock on unmount / page hide.
 */
export function useEditingLock(compositionId: string | null | undefined): UseEditingLockState {
  const [blockedBy, setBlockedBy] = useState<EditingLock | null>(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const releasedRef = useRef(false);

  const tryAcquire = async (force = false) => {
    if (!compositionId) return;
    try {
      const res = await acquireEditLock({ data: { id: compositionId, force } });
      if (res.acquired) {
        setOwned(true);
        setBlockedBy(null);
        releasedRef.current = false;
      } else {
        setOwned(false);
        setBlockedBy(res.lock);
      }
    } catch {
      /* silent — leaves current state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!compositionId) return;
    setLoading(true);
    void tryAcquire(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositionId]);

  // Heartbeat every 30s while we own the lock.
  useEffect(() => {
    if (!compositionId || !owned) return;
    const id = window.setInterval(() => {
      void heartbeatEditLock({ data: { id: compositionId } }).then((r) => {
        if (!r.ok) {
          setOwned(false);
          setBlockedBy(r.lock);
        }
      }).catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [compositionId, owned]);

  // Release on unmount / tab hidden / navigation away.
  useEffect(() => {
    if (!compositionId) return;
    const release = () => {
      if (releasedRef.current || !owned) return;
      releasedRef.current = true;
      try {
        // Fire-and-forget; server function handles auth.
        void releaseEditLock({ data: { id: compositionId } }).catch(() => undefined);
      } catch {
        /* noop */
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") release();
    };
    window.addEventListener("beforeunload", release);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", release);
      document.removeEventListener("visibilitychange", onHide);
      release();
    };
  }, [compositionId, owned]);

  return {
    blockedBy,
    owned,
    loading,
    forceAcquire: () => tryAcquire(true),
    refresh: () => tryAcquire(false),
  };
}

export function formatRelativeSince(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h`;
}