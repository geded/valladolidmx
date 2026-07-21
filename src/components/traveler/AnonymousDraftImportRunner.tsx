/** Importa el viaje local sólo después de que exista una sesión real. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { importAnonymousDraft } from "@/lib/traveler/travel-plans.functions";
import {
  clearAnonymousTrip,
  flushAnonymousTrip,
  importThenClearAnonymousDraft,
  useAnonymousTrip,
} from "@/lib/traveler/anonymous-draft";

export function AnonymousDraftImportRunner() {
  const { user, loading } = useAuth();
  const { trip, status } = useAnonymousTrip();
  const importDraft = useServerFn(importAnonymousDraft);
  const queryClient = useQueryClient();
  const inflight = useRef<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const run = useCallback(async () => {
    if (!user?.id || !trip || inflight.current === trip.draftId) return;
    inflight.current = trip.draftId;
    try {
      await flushAnonymousTrip();
      const result = await importThenClearAnonymousDraft(trip, {
        importDraft: (draft) => importDraft({ data: draft }),
        clearDraft: clearAnonymousTrip,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["traveler", "active-plan", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["traveler", "favorites", user.id] }),
      ]);
      void import("@/lib/alux/plan-signals").then(({ notifyPlanChanged }) =>
        notifyPlanChanged("anonymous_draft_imported"),
      );
      toast.success(
        result.alreadyImported
          ? "Tu viaje ya estaba guardado."
          : "Tu viaje quedó guardado en tu cuenta.",
      );
    } catch {
      inflight.current = null;
      toast.error("Tu viaje sigue seguro en este dispositivo.", {
        description: "No pudimos guardarlo en tu cuenta todavía.",
        action: { label: "Reintentar", onClick: () => setRetryNonce((value) => value + 1) },
      });
    }
  }, [importDraft, queryClient, trip, user?.id]);

  useEffect(() => {
    if (!loading && user?.id && trip && status !== "loading" && status !== "idle") void run();
  }, [loading, retryNonce, run, status, trip, user?.id]);

  return null;
}
