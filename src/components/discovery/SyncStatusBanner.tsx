/**
 * SyncStatusBanner — Adenda 15.10.6.3 · User Awareness.
 *
 * Aviso no bloqueante que informa al usuario cuándo tiene acciones
 * pendientes o fallidas en la cola local de sincronización. Cumple el
 * principio "User Awareness":
 *
 *   "Toda acción pendiente de sincronización deberá ser visible para
 *    el usuario cuando afecte su trabajo. La aplicación nunca deberá
 *    dar la impresión de que una operación fue confirmada por el
 *    servidor cuando aún permanece únicamente en la cola local."
 *
 * Se autoexcluye en iframe / preview Lovable. Sólo lee estado de la
 * cola vía eventos `pwa:sync:*` y `listQueue()`; no cachea ni muta.
 */
import { useEffect, useState } from "react";
import { CloudUpload, AlertTriangle } from "lucide-react";
import { listQueue } from "@/pwa/sync-queue";

type Snapshot = {
  pending: number;
  failed: number;
  conflict: number;
};

const EMPTY: Snapshot = { pending: 0, failed: 0, conflict: 0 };

export function SyncStatusBanner() {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.top !== window.self) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const items = await listQueue();
        if (cancelled) return;
        setSnap({
          pending: items.filter((e) => e.status === "pending" || e.status === "in_flight").length,
          failed: items.filter((e) => e.status === "failed").length,
          conflict: items.filter((e) => e.status === "conflict").length,
        });
      } catch {
        /* noop */
      }
    };

    void refresh();
    const events = [
      "pwa:sync:enqueued",
      "pwa:sync:in_flight",
      "pwa:sync:done",
      "pwa:sync:failed",
      "pwa:sync:conflict",
      "pwa:sync:retry_scheduled",
      "pwa:sync:removed",
      "pwa:sync:purged",
      "pwa:sync:drain_end",
    ];
    const handler = () => void refresh();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => {
      cancelled = true;
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, []);

  const total = snap.pending + snap.failed + snap.conflict;
  if (total === 0) return null;

  const isProblem = snap.failed > 0 || snap.conflict > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "sticky top-0 z-40 flex items-center justify-center gap-2 border-b px-4 py-2 text-xs " +
        (isProblem
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-muted-foreground")
      }
    >
      {isProblem ? (
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <CloudUpload className="h-3.5 w-3.5" aria-hidden />
      )}
      <span>
        {snap.pending > 0 && `Sincronizando ${snap.pending} acción${snap.pending === 1 ? "" : "es"}. `}
        {snap.failed > 0 &&
          `${snap.failed} sin sincronizar — se reintentará automáticamente. `}
        {snap.conflict > 0 &&
          `${snap.conflict} con conflicto — requiere revisión.`}
      </span>
    </div>
  );
}
