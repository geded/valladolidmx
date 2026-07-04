/**
 * PendingActionRegistry — memoria + sessionStorage + BroadcastChannel.
 * (OLA H-01 · Épica 1 · I1)
 *
 * COMPORTAMIENTO DOCUMENTADO:
 * - TTL: 10 min por defecto (`DEFAULT_ACTION_TTL_MS`). Vencido → `take()`
 *   devuelve null y emite `protected_action.expired`.
 * - Limpieza automática: al leer (`peek`/`takeLast`) y al recibir
 *   `SIGNED_OUT` (la limpieza la dispara el ResumeRunner, no el registry).
 * - Múltiples pestañas: los METADATOS se sincronizan por BroadcastChannel +
 *   `storage` event. El PAYLOAD (función `execute`) vive sólo en la
 *   pestaña que lo originó. Si el login ocurre en otra pestaña, la pestaña
 *   original ejecuta al recibir `SIGNED_IN`; la nueva pestaña, al no tener
 *   payload, sólo emite `restored` y descarta (política v1).
 * - Doble click: `push` genera un `id` único por invocación; el hook (I2)
 *   además debe marcar `pending=true` mientras haya una acción en vuelo.
 * - Acciones concurrentes: FIFO en memoria. `takeLast()` toma la más
 *   reciente vigente y descarta el resto (política v1, limitación
 *   conocida — ver DFT E7). Alternativa futura: colas por `kind`.
 * - Recarga de página: los METADATOS sobreviven en `sessionStorage` (misma
 *   pestaña). El PAYLOAD se pierde → `restored` sin ejecución + toast
 *   informativo desde el ResumeRunner.
 * - Pérdida de sesión (`SIGNED_OUT`): el ResumeRunner llama `clear()`.
 * - Modo privado estricto / storage bloqueado: degradación silenciosa a
 *   memoria. Ningún crash.
 */
import {
  DEFAULT_ACTION_TTL_MS,
  PROTECTED_ACTIONS_CHANNEL,
  PROTECTED_ACTIONS_STORAGE_KEY,
  type PendingActionRecord,
  type PendingActionRuntime,
  type ProtectedActionKind,
  type ProtectedActionRequirements,
} from "./types";
import { emitProtectedActionEvent } from "./observability";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(): PendingActionRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.sessionStorage.getItem(PROTECTED_ACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingActionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(records: PendingActionRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(
      PROTECTED_ACTIONS_STORAGE_KEY,
      JSON.stringify(records),
    );
  } catch {
    /* privado estricto / quota → memoria sólo */
  }
}

/** Payloads sólo en memoria (nunca a storage). */
const runtimes = new Map<string, PendingActionRuntime<unknown>>();

/** Cache de metadatos vigentes; se rehidrata en el arranque. */
let records: PendingActionRecord[] = [];

function rehydrate(): void {
  if (!isBrowser()) return;
  records = readStorage().filter((r) => r.expiresAt > Date.now());
  writeStorage(records);
}

rehydrate();

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  if (channel) return channel;
  try {
    channel = new BroadcastChannel(PROTECTED_ACTIONS_CHANNEL);
    channel.addEventListener("message", (ev) => {
      const msg = ev.data as { type?: string } | null;
      if (!msg) return;
      if (msg.type === "sync") {
        records = readStorage().filter((r) => r.expiresAt > Date.now());
      } else if (msg.type === "clear") {
        records = [];
        runtimes.clear();
        writeStorage([]);
      }
    });
  } catch {
    channel = null;
  }
  return channel;
}

function broadcast(type: "sync" | "clear"): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type });
  } catch {
    /* noop */
  }
}

// Sync entre pestañas por `storage` event (fallback a BroadcastChannel).
if (isBrowser()) {
  window.addEventListener("storage", (ev) => {
    if (ev.key !== PROTECTED_ACTIONS_STORAGE_KEY) return;
    records = readStorage().filter((r) => r.expiresAt > Date.now());
  });
}

export interface PushParams<TResult> {
  kind: ProtectedActionKind;
  requirements: ProtectedActionRequirements;
  execute: () => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (err: unknown) => void;
  ttlMs?: number;
  reason?: string;
}

export const PendingActionRegistry = {
  push<TResult>(params: PushParams<TResult>): PendingActionRecord {
    const now = Date.now();
    const ttl = params.ttlMs ?? DEFAULT_ACTION_TTL_MS;
    const record: PendingActionRecord = {
      id: genId(),
      kind: params.kind,
      createdAt: now,
      expiresAt: now + ttl,
      reason: params.reason,
    };
    records = [...records.filter((r) => r.expiresAt > now), record];
    runtimes.set(record.id, {
      record,
      requirements: params.requirements,
      execute: params.execute as () => Promise<unknown>,
      onSuccess: params.onSuccess as ((r: unknown) => void) | undefined,
      onError: params.onError,
    });
    writeStorage(records);
    broadcast("sync");
    emitProtectedActionEvent("protected_action.started", {
      actionId: record.id,
      kind: record.kind,
      ttlMs: ttl,
      reason: params.reason,
    });
    return record;
  },

  peek(): PendingActionRecord[] {
    const now = Date.now();
    records = records.filter((r) => r.expiresAt > now);
    return [...records];
  },

  /**
   * Toma la acción más reciente que aún esté vigente. Descarta el resto
   * (política v1). Devuelve el runtime completo (payload en memoria) si
   * existe; si no, devuelve el record para que el runner pueda emitir
   * `restored` sin ejecutar.
   */
  takeLast(): { record: PendingActionRecord; runtime: PendingActionRuntime<unknown> | null } | null {
    const now = Date.now();
    const alive = records.filter((r) => r.expiresAt > now);
    const expired = records.filter((r) => r.expiresAt <= now);
    expired.forEach((r) => {
      runtimes.delete(r.id);
      emitProtectedActionEvent("protected_action.expired", {
        actionId: r.id,
        kind: r.kind,
      });
    });
    if (alive.length === 0) {
      records = [];
      writeStorage([]);
      return null;
    }
    const last = alive[alive.length - 1];
    // Descartar el resto (política v1, limitación conocida).
    alive.slice(0, -1).forEach((r) => {
      runtimes.delete(r.id);
      emitProtectedActionEvent("protected_action.cancelled", {
        actionId: r.id,
        kind: r.kind,
        reason: "superseded",
      });
    });
    records = [];
    writeStorage([]);
    broadcast("sync");
    const runtime = runtimes.get(last.id) ?? null;
    runtimes.delete(last.id);
    return { record: last, runtime };
  },

  cancel(id: string, reason?: string): void {
    const found = records.find((r) => r.id === id);
    records = records.filter((r) => r.id !== id);
    runtimes.delete(id);
    writeStorage(records);
    broadcast("sync");
    if (found) {
      emitProtectedActionEvent("protected_action.cancelled", {
        actionId: id,
        kind: found.kind,
        reason,
      });
    }
  },

  clear(reason?: string): void {
    const snapshot = [...records];
    records = [];
    runtimes.clear();
    writeStorage([]);
    broadcast("clear");
    snapshot.forEach((r) =>
      emitProtectedActionEvent("protected_action.cancelled", {
        actionId: r.id,
        kind: r.kind,
        reason,
      }),
    );
  },
};
