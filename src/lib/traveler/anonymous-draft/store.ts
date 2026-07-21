/** Store local-first coherente para AnonymousTravelDraft. Cero red. */
import {
  AnonymousTravelDraftSchema,
  createEmptyDraft,
  migrateDraft,
  type AnonymousTravelDraft,
} from "./contract";
import { ANON_LIMITS } from "./limits";
import { LEGACY_GUEST_QUEUE_KEY, migrateLegacyGuestQueue } from "./legacy";

const DB_NAME = "vmx.alux.companion";
const DB_VERSION = 1;
const STORE = "current_trip";
const RECORD_KEY = "current";
const LS_FALLBACK_KEY = "vmx.alux.companion.current.v1";
const LS_META_KEY = "vmx.alux.companion.meta.v1";

type Listener = (draft: AnonymousTravelDraft | null) => void;
const listeners = new Set<Listener>();
let snapshot: AnonymousTravelDraft | null = null;
let loaded = false;
let loading: Promise<AnonymousTravelDraft | null> | null = null;
let pending: AnonymousTravelDraft | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function notify(): void {
  for (const listener of listeners) listener(snapshot);
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasWindow() || typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
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
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(RECORD_KEY);
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
      tx.objectStore(STORE).put(value, RECORD_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
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
    // El fallback local se elimina de todas formas.
  }
}

function parseLocal(key: string): unknown {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function putLocal(value: AnonymousTravelDraft): boolean {
  if (!hasWindow()) return false;
  try {
    const payload = JSON.stringify(value);
    if (new TextEncoder().encode(payload).byteLength > ANON_LIMITS.payloadBytes) return false;
    window.localStorage.setItem(LS_FALLBACK_KEY, payload);
    window.localStorage.setItem(
      LS_META_KEY,
      JSON.stringify({
        draftId: value.draftId,
        updatedAt: value.updatedAt,
        travelStage: value.travelStage,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function deleteLocal(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(LS_FALLBACK_KEY);
    window.localStorage.removeItem(LS_META_KEY);
  } catch {
    // noop
  }
}

async function persist(draft: AnonymousTravelDraft, now = Date.now()): Promise<boolean> {
  const next = { ...draft, updatedAt: now };
  const validated = AnonymousTravelDraftSchema.safeParse(next);
  if (!validated.success) return false;
  if (
    new TextEncoder().encode(JSON.stringify(validated.data)).byteLength > ANON_LIMITS.payloadBytes
  )
    return false;
  const ok = (await idbPut(validated.data)) || putLocal(validated.data);
  if (ok && snapshot?.draftId === validated.data.draftId) snapshot = validated.data;
  return ok;
}

export function getAnonymousTripSnapshot(): AnonymousTravelDraft | null {
  return snapshot;
}

export function subscribeAnonymousTrip(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function readAnonymousTrip(now = Date.now()): Promise<AnonymousTravelDraft | null> {
  if (!hasWindow()) return null;
  if (loaded) return snapshot;
  if (loading) return loading;
  loading = (async () => {
    const idbDraft = migrateDraft(await idbGet(), now);
    const localDraft = migrateDraft(parseLocal(LS_FALLBACK_KEY), now);
    let draft =
      idbDraft && localDraft
        ? idbDraft.updatedAt >= localDraft.updatedAt
          ? idbDraft
          : localDraft
        : (idbDraft ?? localDraft);
    // `pagehide` puede haber alcanzado localStorage antes del debounce de IDB.
    // Reconciliamos por updatedAt y reponemos IDB en segundo plano.
    if (draft === localDraft && localDraft) void persist(localDraft, localDraft.updatedAt);
    if (!draft) {
      const legacy = migrateLegacyGuestQueue(parseLocal(LEGACY_GUEST_QUEUE_KEY), { now });
      if (legacy && (await persist(legacy, now))) {
        draft = legacy;
        try {
          window.localStorage.removeItem(LEGACY_GUEST_QUEUE_KEY);
        } catch {
          /* noop */
        }
      } else {
        await idbDelete();
        deleteLocal();
      }
    }
    snapshot = draft;
    loaded = true;
    loading = null;
    notify();
    return snapshot;
  })();
  return loading;
}

export async function writeAnonymousTrip(
  draft: AnonymousTravelDraft,
  now = Date.now(),
): Promise<boolean> {
  if (!hasWindow()) return false;
  const ok = await persist(draft, now);
  if (ok) {
    snapshot = { ...draft, updatedAt: now };
    loaded = true;
    notify();
  }
  return ok;
}

/** Publica en memoria inmediatamente y consolida una sola escritura a 400 ms. */
export function scheduleAnonymousTripWrite(draft: AnonymousTravelDraft): void {
  snapshot = draft;
  loaded = true;
  pending = draft;
  notify();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushAnonymousTrip();
  }, ANON_LIMITS.writeDebounceMs);
}

export async function flushAnonymousTrip(): Promise<boolean> {
  if (timer) clearTimeout(timer);
  timer = null;
  const draft = pending;
  pending = null;
  if (!draft) return true;
  const ok = await persist(draft);
  if (!ok) pending = draft;
  return ok;
}

export async function clearAnonymousTrip(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
  snapshot = null;
  loaded = true;
  notify();
  await idbDelete();
  deleteLocal();
}

export async function ensureAnonymousTrip(now = Date.now()): Promise<AnonymousTravelDraft> {
  return (await readAnonymousTrip(now)) ?? createEmptyDraft({ now });
}

if (hasWindow()) {
  window.addEventListener("pagehide", () => {
    if (pending) putLocal(pending);
  });
}
