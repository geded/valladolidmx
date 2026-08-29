/**
 * G8-R1-E-R3 · Fusión anónimo → cuenta y continuidad multidispositivo.
 *
 * Al iniciar sesión:
 *  1. Recupera el RESUMEN permitido de la cuenta y lo aplica a la memoria
 *     de la pestaña (continuidad en un dispositivo nuevo).
 *  2. Publica el resumen local acreditando POSESIÓN del navegador con un
 *     secreto aleatorio (sólo viaja su hash). Operación idempotente.
 *
 * Al cerrar sesión limpia el resumen remoto de memoria: la sesión siguiente
 * en el mismo navegador no ve la memoria de la cuenta anterior.
 *
 * No renderiza UI. No reescribe eventos append-only. No sincroniza historial
 * detallado ni ubicación precisa.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  ALUX_MEMORY_TTL_MS,
  applyRemoteMemorySummary,
  getAluxPossessionSecret,
  getAluxSignalSummary,
  readAluxMemory,
} from "@/lib/alux/memory-store";
import { toMemorySummary } from "@/lib/alux/memory-summary";

export function AluxMemorySyncRunner() {
  const { user } = useAuth();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      syncedFor.current = null;
      applyRemoteMemorySummary(null);
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;
    void (async () => {
      try {
        const mod = await import("@/lib/alux/memory-projection.functions");
        const remote = await mod.getTravelerMemoryProjection();
        if (cancelled) return;
        if (remote?.summary) applyRemoteMemorySummary(remote.summary);

        const memory = readAluxMemory();
        if (memory.personalization === "paused") return;
        const summary = toMemorySummary({
          signals: getAluxSignalSummary(),
          ttlMs: ALUX_MEMORY_TTL_MS,
        });
        const saved = await mod.syncTravelerMemoryProjection({
          data: {
            summary,
            personalization: memory.personalization,
            possessionSecret: getAluxPossessionSecret() || undefined,
          },
        });
        if (!cancelled && saved?.summary) applyRemoteMemorySummary(saved.summary);
      } catch {
        /* la memoria local sigue operando; la nube es complemento */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}
