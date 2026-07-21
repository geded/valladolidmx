import { useCallback, useEffect, useState } from "react";
import {
  clearAnonymousTrip,
  ensureAnonymousTrip,
  getAnonymousTripSnapshot,
  readAnonymousTrip,
  scheduleAnonymousTripWrite,
  subscribeAnonymousTrip,
} from "./store";
import {
  ANON_DRAFT_TTL_MS,
  type AnonymousFavorite,
  type AnonymousPlannedItem,
  type AnonymousTravelDraft,
} from "./contract";
import { isAtLimit } from "./limits";

export type AnonymousTripStatus = "idle" | "loading" | "empty" | "active" | "returning";
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
  const initial = getAnonymousTripSnapshot();
  const [trip, setTrip] = useState<AnonymousTravelDraft | null>(initial);
  const [status, setStatus] = useState<AnonymousTripStatus>(initial ? "active" : "idle");
  const [hasReturningTrip, setHasReturningTrip] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus((current) => (current === "idle" ? "loading" : current));
    const unsubscribe = subscribeAnonymousTrip((next) => {
      if (!active) return;
      setTrip(next);
      if (!next) setStatus("empty");
      else setStatus((current) => (current === "returning" ? current : "active"));
    });
    void readAnonymousTrip().then((next) => {
      if (!active) return;
      const returning = Boolean(next && Date.now() - next.createdAt > 60_000);
      setHasReturningTrip(returning);
      setStatus(next ? (returning ? "returning" : "active") : "empty");
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const mutate = useCallback(
    async (updater: (current: AnonymousTravelDraft) => AnonymousTravelDraft | null) => {
      const ensured = await ensureAnonymousTrip();
      // Otra superficie pudo mutar mientras esperábamos IDB. Volver a leer
      // el snapshot compartido evita que dos clics cercanos se sobrescriban.
      const current = getAnonymousTripSnapshot() ?? ensured;
      const next = updater(current);
      if (!next) return null;
      const now = Date.now();
      const stamped = { ...next, updatedAt: now, expiresAt: now + ANON_DRAFT_TTL_MS };
      scheduleAnonymousTripWrite(stamped);
      return stamped;
    },
    [],
  );

  const addFavorite: UseAnonymousTripResult["addFavorite"] = useCallback(
    async (favorite) => {
      let reason: "limit" | undefined;
      const next = await mutate((current) => {
        if (
          current.favorites.some((item) => item.kind === favorite.kind && item.id === favorite.id)
        )
          return current;
        if (isAtLimit("favorites", current.favorites.length)) {
          reason = "limit";
          return null;
        }
        return {
          ...current,
          favorites: [...current.favorites, { ...favorite, addedAt: Date.now() }],
        };
      });
      return { ok: Boolean(next), reason };
    },
    [mutate],
  );

  const removeFavorite: UseAnonymousTripResult["removeFavorite"] = useCallback(
    async (kind, id) =>
      Boolean(
        await mutate((current) => ({
          ...current,
          favorites: current.favorites.filter((item) => item.kind !== kind || item.id !== id),
        })),
      ),
    [mutate],
  );

  const addPlannedItem: UseAnonymousTripResult["addPlannedItem"] = useCallback(
    async (item) => {
      let reason: "limit" | undefined;
      const next = await mutate((current) => {
        if (
          current.plannedItems.some(
            (saved) => saved.kind === item.kind && saved.targetId === item.targetId,
          )
        )
          return current;
        if (isAtLimit("plannedItems", current.plannedItems.length)) {
          reason = "limit";
          return null;
        }
        return {
          ...current,
          plannedItems: [...current.plannedItems, { ...item, addedAt: Date.now() }],
        };
      });
      return { ok: Boolean(next), reason };
    },
    [mutate],
  );

  const removePlannedItem: UseAnonymousTripResult["removePlannedItem"] = useCallback(
    async (kind, targetId) =>
      Boolean(
        await mutate((current) => ({
          ...current,
          plannedItems: current.plannedItems.filter(
            (item) => item.kind !== kind || item.targetId !== targetId,
          ),
        })),
      ),
    [mutate],
  );

  const reset = useCallback(async () => {
    await clearAnonymousTrip();
    setHasReturningTrip(false);
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
