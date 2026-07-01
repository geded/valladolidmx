/**
 * sync-queue.ts — Adenda 15.10.6.3 · Sync Queue (IndexedDB).
 *
 * Cola local de mutaciones autorizadas para sincronización diferida.
 * Implementada sobre IndexedDB nativo (sin dependencias externas) para
 * garantizar durabilidad entre sesiones sin acoplarse a librerías.
 *
 * Principios de gobernanza 15.10.6.3 aplicados aquí:
 *  - Reliable Sync: la cola prioriza integridad sobre velocidad. Toda
 *    entrada persiste con id, timestamp, estado y contador de reintentos.
 *  - Idempotencia obligatoria: `idempotencyKey` es requerido en cada
 *    entrada; el runner lo reenvía como header `X-Idempotency-Key`.
 *  - Denylist absoluto: pagos, autenticación, permisos y datos
 *    financieros JAMÁS entran a la cola (`assertAuthorizedResource`).
 *  - Observability First: mutaciones y transiciones emiten `pwa:sync:*`.
 *  - Conflict Safety: los conflictos (409/412) no se reintentan
 *    automáticamente; quedan en estado `conflict` para resolución
 *    explícita del consumidor.
 *
 * No captura mutaciones existentes automáticamente. La adopción por
 * cada superficie se hará en sub-adendas posteriores (15.10.6.3.x)
 * conforme se autorice caso por caso.
 */

const DB_NAME = "valladolidmx.sync" as const;
const DB_VERSION = 1 as const;
const STORE = "queue" as const;

export type SyncEntryStatus =
  | "pending"
  | "in_flight"
  | "failed"
  | "conflict"
  | "discarded"
  | "done";

export interface SyncEntry {
  /** UUID v4 estable, único por operación. */
  id: string;
  /** Identificador de recurso lógico (ej. "reviews.create"). */
  resource: string;
  /** Endpoint HTTP absoluto o relativo (mismo origen). */
  endpoint: string;
  /** Método HTTP (POST/PUT/PATCH/DELETE). GET nunca se encola. */
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  /** Payload JSON serializable. Nunca incluye tokens ni secrets. */
  payload: unknown;
  /** Clave de idempotencia obligatoria — el backend debe respetarla. */
  idempotencyKey: string;
  /** ISO-8601 de creación. */
  createdAt: string;
  /** ISO-8601 del último intento. */
  updatedAt: string;
  /** Contador de intentos ejecutados. */
  attempts: number;
  /** Estado actual dentro del ciclo de vida. */
  status: SyncEntryStatus;
  /** Descripción legible mostrada al usuario ("Guardando reseña…"). */
  label: string;
  /** Último error (mensaje corto), si aplica. */
  lastError?: string;
}

export type SyncEnqueueInput = Omit<
  SyncEntry,
  "id" | "createdAt" | "updatedAt" | "attempts" | "status"
> & { id?: string };

/**
 * Recursos EXPLÍCITAMENTE prohibidos en la cola. Cualquier intento de
 * encolar un endpoint que caiga aquí lanza. Cumple:
 *  "No sincronizar operaciones relacionadas con pagos, autenticación,
 *   cambios de permisos o información financiera."
 */
const FORBIDDEN_PATH = [
  /^\/?~oauth/,
  /^\/?api\/(?:public\/)?payments(?:\/|$)/,
  /^\/?auth(?:\/|$)/,
  /(?:^|\/)stripe(?:\/|$)/,
  /(?:^|\/)paddle(?:\/|$)/,
  /(?:^|\/)billing(?:\/|$)/,
  /(?:^|\/)invoice/,
  /(?:^|\/)payouts?/,
  /(?:^|\/)roles?(?:\/|$)/,
  /(?:^|\/)permissions?(?:\/|$)/,
  /(?:^|\/)user[_-]?roles?/,
  /(?:^|\/)session(?:\/|$)/,
  /(?:^|\/)tokens?(?:\/|$)/,
];

function assertAuthorizedResource(endpoint: string, resource: string): void {
  const target = endpoint.toLowerCase();
  const tag = resource.toLowerCase();
  for (const rx of FORBIDDEN_PATH) {
    if (rx.test(target) || rx.test(tag)) {
      throw new Error(
        `[sync-queue] recurso prohibido para cola offline: ${resource}`,
      );
    }
  }
}

function emit(event: string, detail?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(`pwa:sync:${event}`, { detail }));
  } catch {
    /* noop */
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) return Promise.reject(new Error("no-idb"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb-open-failed"));
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result: T;
        Promise.resolve(fn(store))
          .then((r) => {
            result = r;
          })
          .catch(reject);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error ?? new Error("idb-tx-failed"));
        t.onabort = () => reject(t.error ?? new Error("idb-tx-aborted"));
      }),
  );
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Encola una mutación. Requiere `idempotencyKey`; el backend deberá
 * respetarla para garantizar ejecuciones seguras en reintentos.
 * Lanza si el recurso está en la denylist.
 */
export async function enqueueMutation(input: SyncEnqueueInput): Promise<SyncEntry> {
  if (!isBrowser()) throw new Error("[sync-queue] sólo disponible en navegador");
  assertAuthorizedResource(input.endpoint, input.resource);
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    throw new Error("[sync-queue] idempotencyKey obligatorio (≥8 chars)");
  }
  const now = new Date().toISOString();
  const entry: SyncEntry = {
    id: input.id ?? uuid(),
    resource: input.resource,
    endpoint: input.endpoint,
    method: input.method,
    payload: input.payload ?? null,
    idempotencyKey: input.idempotencyKey,
    label: input.label,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
    status: "pending",
  };
  await tx("readwrite", (s) => s.put(entry));
  emit("enqueued", { id: entry.id, resource: entry.resource, label: entry.label });
  return entry;
}

export async function listQueue(status?: SyncEntryStatus): Promise<SyncEntry[]> {
  if (!isBrowser()) return [];
  return tx("readonly", (store) => {
    return new Promise<SyncEntry[]>((resolve, reject) => {
      const out: SyncEntry[] = [];
      const src = status ? store.index("status").openCursor(IDBKeyRange.only(status)) : store.openCursor();
      src.onsuccess = () => {
        const cursor = src.result;
        if (!cursor) {
          out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          resolve(out);
          return;
        }
        out.push(cursor.value as SyncEntry);
        cursor.continue();
      };
      src.onerror = () => reject(src.error ?? new Error("idb-cursor-failed"));
    });
  });
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<SyncEntry, "id" | "createdAt">>,
): Promise<SyncEntry | null> {
  if (!isBrowser()) return null;
  return tx("readwrite", (store) => {
    return new Promise<SyncEntry | null>((resolve, reject) => {
      const g = store.get(id);
      g.onsuccess = () => {
        const current = g.result as SyncEntry | undefined;
        if (!current) return resolve(null);
        const next: SyncEntry = {
          ...current,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        const p = store.put(next);
        p.onsuccess = () => resolve(next);
        p.onerror = () => reject(p.error ?? new Error("idb-put-failed"));
      };
      g.onerror = () => reject(g.error ?? new Error("idb-get-failed"));
    });
  });
}

export async function deleteEntry(id: string): Promise<void> {
  if (!isBrowser()) return;
  await tx("readwrite", (s) => s.delete(id));
  emit("removed", { id });
}

/**
 * Kill-switch: vacía completamente la cola local. Emite un evento por
 * cada entrada eliminada para observabilidad. Cumple la condición:
 * "Mantener Kill Switch operativo para toda la infraestructura Offline."
 */
export async function purgeQueue(): Promise<number> {
  if (!isBrowser()) return 0;
  const items = await listQueue();
  await tx("readwrite", (s) => s.clear());
  emit("purged", { count: items.length });
  return items.length;
}

export async function countPending(): Promise<number> {
  const all = await listQueue();
  return all.filter((e) => e.status === "pending" || e.status === "failed").length;
}

export const __SYNC_QUEUE_INTERNAL__ = {
  DB_NAME,
  STORE,
  FORBIDDEN_PATH,
  emit,
};
