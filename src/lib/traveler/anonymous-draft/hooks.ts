/**
 * useAnonymousTrip — hook cliente (AC1.1).
 *
 * Expone lecturas y mutaciones seguras al AnonymousTravelDraft local.
 * Todas las escrituras usan debounce (`ANON_LIMITS.writeDebounceMs`).
 * SSR-safe: durante SSR devuelve `{ status: "idle", trip: null }`.
 *
 * Este hook NO expone terminología técnica; los consumidores construyen la
 * UX con `copy.ts`. El flag `hasReturningTrip` habilita el Delight Moment
 * de continuidad (AC1.3).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearAnonymousTrip,
  ensureAnonymousTrip,
  readAnonymousTrip,
  writeAnonymousTrip,
} from "./store";
import {
  ANON_DRAFT_TTL_MS,
  createEmptyDraft,
  type AnonymousFavorite,
  type AnonymousPlannedItem,
  type AnonymousTravelDraft,
} from "./contract";
import { ANON_LIMITS, isAtLimit } from "./limits";

export type AnonymousTripStatus =
  | "idle"
  | "loading"
  | "empty"
  | "active"
  | "returning";

export interface UseAnonymousTripResult {
  status: AnonymousTripStatus;
  trip: AnonymousTravelDraft | null;
  hasReturningTrip: boolean;
  addFavorite: (
    fav: Omit<AnonymousFavorite, "addedAt">,
  ) => Promise<{ ok: boolean; reason?: "limit" }>;
  removeFavorite: (kind: AnonymousFavorite["kind"], id: string) => Promise<boolean>;
  addPlannedItem: (
    item: Omit<AnonymousPlannedItem, "addedAt">,
  ) => Promise<{ ok: boolean; reason?: "limit" }>;
  removePlannedItem: (
    kind: AnonymousPlannedItem["kind"],
    targetId: string | null,
  ) => Promise<boolean>;
  reset: () => Promise<void>;
  acknowledgeReturn: () => void;
}

export function useAnonymousTrip(): UseAnonymousTripResult {
  const [status, setStatus] = useState<AnonymousTripStatus>("idle");
  const [trip, setTrip] = useState<AnonymousTravelDraft | null>(null);
  const [hasReturningTrip, setHasReturningTrip] = useState(false);
  const pending = useRef<AnonymousTravelDraft | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      const existing = await readAnonymousTrip();
      if (cancelled) return;
      if (existing) {
        setTrip(existing);
        const isReturning = Date.now() - existing.createdAt > 60_000;
        setHasReturningTrip(isReturning);
        setStatus(isReturning ? "returning" : "active");
      } else {
        setStatus("empty");
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const scheduleFlush = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const draft = pending.current;
      if (!draft) return;
      await writeAnonymousTrip(draft);
      pending.current = null;
    }, ANON_LIMITS.writeDebounceMs);
  }, []);

  const mutate = useCallback(
    async (
      updater: (current: AnonymousTravelDraft) => AnonymousTravelDraft | null,
    ): Promise<AnonymousTravelDraft | null> => {
      const base = trip ?? (await ensureAnonymousTrip());
      const next = updater(base);
      if (!next) return null;
      const now = Date.now();
      const stamped: AnonymousTravelDraft = {
        ...next,
        updatedAt: now,
        expiresAt: now + ANON_DRAFT_TTL_MS,
      };
      setTrip(stamped);
      setStatus("active");
      pending.current = stamped;
      scheduleFlush();
      return stamped;
    },
    [trip, scheduleFlush],
  );

  const addFavorite: UseAnonymousTripResult["addFavorite"] = useCallback(
    async (fav) => {
      let reason: "limit" | undefined;
      const next = await mutate((current) => {
        if (current.favorites.some((f) => f.kind === fav.kind && f.id === fav.id)) return current;
        if (isAtLimit("favorites", current.favorites.length)) {
          reason = "limit";
          return null;
        }
        return {
          ...current,
          favorites: [...current.favorites, { ...fav, addedAt: Date.now() }],
        };
      });
      return { ok: next !== null, reason };
    },
    [mutate],
  );

  const removeFavorite: UseAnonymousTripResult["removeFavorite"] = useCallback(
    async (kind, id) => {
      const next = await mutate((current) => ({
        ...current,
        favorites: current.favorites.filter((f) => !(f.kind === kind && f.id === id)),
      }));
      return next !== null;
    },
    [mutate],
  );

  const addPlannedItem: UseAnonymousTripResult["addPlannedItem"] = useCallback(
    async (item) => {
      let reason: "limit" | undefined;
      const next = await mutate((current) => {
        if (
          current.plannedItems.some(
            (i) => i.kind === item.kind && i.targetId === item.targetId,
          )
        ) {
          return current;
        }
        if (isAtLimit("plannedItems", current.plannedItems.length)) {
          reason = "limit";
          return null;
        }
        return {
          ...current,
          plannedItems: [...current.plannedItems, { ...item, addedAt: Date.now() }],
        };
      });
      return { ok: next !== null, reason };
    },
    [mutate],
  );

  const removePlannedItem: UseAnonymousTripResult["removePlannedItem"] = useCallback(
    async (kind, targetId) => {
      const next = await mutate((current) => ({
        ...current,
        plannedItems: current.plannedItems.filter(
          (i) => !(i.kind === kind && i.targetId === targetId),
        ),
      }));
      return next !== null;
    },
    [mutate],
  );

  const reset = useCallback(async () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    pending.current = null;
    await clearAnonymousTrip();
    setTrip(null);
    setHasReturningTrip(false);
    setStatus("empty");
  }, []);

  const acknowledgeReturn = useCallback(() => {
    setHasReturningTrip(false);
    setStatus("active");
  }, []);

  return {
    status,
    trip,
    hasReturningTrip,
    addFavorite,
    removeFavorite,
    addPlannedItem,
    removePlannedItem,
    reset,
    acknowledgeReturn,
  };
}

export { createEmptyDraft };
