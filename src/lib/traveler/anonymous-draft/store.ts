/**
 * Store local-first para AnonymousTravelDraft (AC1.1).
 *
 * - Persistencia: IndexedDB (base) con fallback a localStorage cuando IDB no
 *   está disponible (Safari privado, cuota llena, etc.).
 * - Un único registro por dispositivo (key `current`).
 * - Validación estricta al leer/escribir vía Zod (contract.ts).
 * - Sin llamadas de red. Sin cookies. Sin Realtime.
 * - SSR-safe: todas las funciones son NO-OP si `window` no existe.
 */
import {
  AnonymousTravelDraftSchema,
  createEmptyDraft,
  migrateDraft,
  type AnonymousTravelDraft,
} from "./contract";
import { ANON_LIMITS } from "./limits";

const DB_NAME = "vmx.alux.companion";
const DB_VERSION = 1;
const STORE = "current_trip";
const RECORD_KEY = "current";
const LS_FALLBACK_KEY = "vmx.alux.companion.current.v1";
const LS_META_KEY = "vmx.alux.companion.meta.v1";

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasWindow()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(): Promise<unknown> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(value: AnonymousTravelDraft): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).put(value, RECORD_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(RECORD_KEY);
  } catch {
    /* noop */
  }
}

function lsGet(): unknown {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsPut(value: AnonymousTravelDraft): boolean {
  if (!hasWindow()) return false;
  try {
    const payload = JSON.stringify(value);
    if (payload.length > ANON_LIMITS.payloadBytes) return false;
    window.localStorage.setItem(LS_FALLBACK_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

function lsDelete(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(LS_FALLBACK_KEY);
    window.localStorage.removeItem(LS_META_KEY);
  } catch {
    /* noop */
  }
}

function writeMeta(draft: AnonymousTravelDraft): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(
      LS_META_KEY,
      JSON.stringify({
        draftId: draft.draftId,
        updatedAt: draft.updatedAt,
        travelStage: draft.travelStage,
      }),
    );
  } catch {
    /* noop */
  }
}

export async function readAnonymousTrip(
  now: number = Date.now(),
): Promise<AnonymousTravelDraft | null> {
  if (!hasWindow()) return null;
  const raw = (await idbGet()) ?? lsGet();
  const draft = migrateDraft(raw, now);
  if (!draft) {
    await clearAnonymousTrip();
    return null;
  }
  return draft;
}

export async function writeAnonymousTrip(
  draft: AnonymousTravelDraft,
  now: number = Date.now(),
): Promise<boolean> {
  if (!hasWindow()) return false;
  const next: AnonymousTravelDraft = { ...draft, updatedAt: now };
  const validated = AnonymousTravelDraftSchema.safeParse(next);
  if (!validated.success) return false;
  const size = new Blob([JSON.stringify(validated.data)]).size;
  if (size > ANON_LIMITS.payloadBytes) return false;
  const ok = (await idbPut(validated.data)) || lsPut(validated.data);
  if (ok) writeMeta(validated.data);
  return ok;
}

export async function clearAnonymousTrip(): Promise<void> {
  await idbDelete();
  lsDelete();
}

export async function ensureAnonymousTrip(
  now: number = Date.now(),
): Promise<AnonymousTravelDraft> {
  const existing = await readAnonymousTrip(now);
  return existing ?? createEmptyDraft({ now });
}
