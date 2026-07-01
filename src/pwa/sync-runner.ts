/**
 * sync-runner.ts — Adenda 15.10.6.3 · Background Synchronization.
 *
 * Runner en el hilo principal que drena la cola local de mutaciones
 * autorizadas cuando hay conectividad. No usa Web Background Sync API
 * directamente (aún no soportado en Safari/iOS y requiere un service
 * worker con acceso a la cola); en su lugar dispara automáticamente
 * ante los eventos `online`, `visibilitychange` (a visible) y un
 * intervalo defensivo.
 *
 * Cumple la gobernanza 15.10.6.3:
 *  - Reliable Sync: reintentos con backoff exponencial. Máximo 5
 *    intentos antes de marcar `failed` (queda en cola hasta resolución
 *    o descarte controlado por el usuario).
 *  - Idempotencia: envía `X-Idempotency-Key` en cada intento.
 *  - Conflict Safety: 409/412 → estado `conflict`, sin reintento auto.
 *  - Observability First: cada transición emite `pwa:sync:*`.
 *  - User Awareness: `SyncStatusBanner` refleja pending / in_flight /
 *    failed / conflict en tiempo real.
 *  - Kill Switch: `?sw=off` desactiva registro del SW, y `purgeQueue()`
 *    limpia la cola local.
 */

import {
  listQueue,
  updateEntry,
  type SyncEntry,
  __SYNC_QUEUE_INTERNAL__,
} from "./sync-queue";

const MAX_ATTEMPTS = 5;
const MIN_INTERVAL_MS = 60_000;

let running = false;
let started = false;

function emit(event: string, detail?: Record<string, unknown>) {
  __SYNC_QUEUE_INTERNAL__.emit(event, detail);
}

function backoffMs(attempts: number): number {
  // 2s, 4s, 8s, 16s, 32s (jitter suave)
  const base = Math.min(2 ** attempts, 32) * 1000;
  return base + Math.floor(Math.random() * 500);
}

async function attemptEntry(entry: SyncEntry): Promise<void> {
  await updateEntry(entry.id, { status: "in_flight" });
  emit("in_flight", { id: entry.id, resource: entry.resource });
  try {
    const res = await fetch(entry.endpoint, {
      method: entry.method,
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": entry.idempotencyKey,
      },
      credentials: "same-origin",
      body: entry.payload == null ? undefined : JSON.stringify(entry.payload),
    });

    if (res.status === 409 || res.status === 412) {
      const body = await safeText(res);
      await updateEntry(entry.id, {
        status: "conflict",
        attempts: entry.attempts + 1,
        lastError: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      });
      emit("conflict", { id: entry.id, status: res.status });
      return;
    }

    if (!res.ok) {
      const body = await safeText(res);
      const nextAttempts = entry.attempts + 1;
      const isTerminal = nextAttempts >= MAX_ATTEMPTS;
      await updateEntry(entry.id, {
        status: isTerminal ? "failed" : "pending",
        attempts: nextAttempts,
        lastError: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      });
      emit(isTerminal ? "failed" : "retry_scheduled", {
        id: entry.id,
        status: res.status,
        attempts: nextAttempts,
      });
      if (!isTerminal) {
        window.setTimeout(() => void drain(), backoffMs(nextAttempts));
      }
      return;
    }

    await updateEntry(entry.id, {
      status: "done",
      attempts: entry.attempts + 1,
      lastError: undefined,
    });
    emit("done", { id: entry.id, resource: entry.resource });
  } catch (err) {
    const nextAttempts = entry.attempts + 1;
    const isTerminal = nextAttempts >= MAX_ATTEMPTS;
    await updateEntry(entry.id, {
      status: isTerminal ? "failed" : "pending",
      attempts: nextAttempts,
      lastError: (err as Error)?.message ?? "network error",
    });
    emit(isTerminal ? "failed" : "retry_scheduled", {
      id: entry.id,
      attempts: nextAttempts,
    });
    if (!isTerminal) {
      window.setTimeout(() => void drain(), backoffMs(nextAttempts));
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function drain(): Promise<void> {
  if (typeof window === "undefined") return;
  if (running) return;
  if (!navigator.onLine) {
    emit("skipped", { reason: "offline" });
    return;
  }
  running = true;
  emit("drain_start");
  try {
    const pending = (await listQueue()).filter((e) => e.status === "pending");
    for (const entry of pending) {
      await attemptEntry(entry);
    }
  } finally {
    running = false;
    emit("drain_end");
  }
}

/**
 * Arranca el runner. Idempotente: si ya está iniciado, no re-suscribe.
 * Se autoexcluye en iframes / preview (mismo criterio que register-sw)
 * para no ejecutar sincronización desde el editor Lovable.
 */
export function startSyncRunner(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  if (window.top !== window.self) return;
  const search = window.location.search;
  if (search.includes("sw=off")) return;

  started = true;
  window.addEventListener("online", () => void drain());
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void drain();
  });
  window.setInterval(() => void drain(), MIN_INTERVAL_MS);
  // Primer intento diferido para no competir con hydration.
  window.setTimeout(() => void drain(), 4_000);
}
