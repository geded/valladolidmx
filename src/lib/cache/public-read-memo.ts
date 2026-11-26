import { fromOwnDomainDeep, ownDomainDeep } from "@/lib/media/own-domain-signed";
/**
 * Memoria breve en el servidor para lecturas públicas (anónimas) de las
 * páginas. Nivel 1: memoria del proceso. Nivel 2: tabla
 * `public_read_cache` compartida por todos los servidores (una sola
 * consulta en lugar de decenas). Fresco 60 s; hasta 30 min devuelve la copia
 * y la renueva en segundo plano. En el navegador no guarda nada.
 */
type Entry = { value: unknown; at: number; refreshing?: boolean };
const FRESH_MS = 60_000;
const STALE_MS = 30 * 60_000;
const MAX = 500;
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const sharedReads = new Map<string, Promise<Entry | null>>();

async function admin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

async function readShared(key: string): Promise<Entry | null> {
  const pending = sharedReads.get(key);
  if (pending) return pending;
  const read = fetchShared(key).finally(() => sharedReads.delete(key));
  sharedReads.set(key, read);
  return read;
}

async function fetchShared(key: string): Promise<Entry | null> {
  try {
    const sb = await admin();
    const { data } = await sb
      .from("public_read_cache")
      .select("value, refreshed_at")
      .eq("key", key)
      .maybeSingle();
    if (!data) return null;
    return { value: ownDomainDeep(data.value), at: Date.parse(data.refreshed_at) };
  } catch {
    return null;
  }
}

function plainJson(v: unknown, depth = 0): boolean {
  if (depth > 40) return false;
  if (v === null || ["string", "number", "boolean"].includes(typeof v)) return true;
  if (Array.isArray(v)) return v.every((x) => plainJson(x, depth + 1));
  if (typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype)
    return Object.values(v as object).every((x) => x === undefined || plainJson(x, depth + 1));
  return false;
}

async function writeShared(key: string, value: unknown, at: number) {
  // Sólo datos JSON puros: fechas u objetos especiales cambiarían al volver.
  if (!plainJson(value)) return;
  try {
    const sb = await admin();
    await sb.from("public_read_cache").upsert({
      key,
      value: fromOwnDomainDeep(JSON.parse(JSON.stringify(value ?? null)), process.env.SUPABASE_URL ?? ""),
      refreshed_at: new Date(at).toISOString(),
    });
  } catch {
    /* la copia compartida es opcional */
  }
}

// Cada guardado en el CMS borra las copias compartidas y marca la hora en
// `__cms_changed__` (disparador en la base). Cada servidor consulta esa hora
// como mucho cada 5 s y descarta su copia local si es anterior.
const CHANGED_KEY = "__cms_changed__";
const CHECK_MS = 5_000;
let lastChange = 0;
let checkedAt = 0;
let checking: Promise<void> | null = null;
async function cmsChangedAt(): Promise<number> {
  if (Date.now() - checkedAt < CHECK_MS) return lastChange;
  checking ??= readShared(CHANGED_KEY)
    .then((e) => {
      if (e && e.at > lastChange) lastChange = e.at;
      checkedAt = Date.now();
    })
    .finally(() => (checking = null));
  await checking;
  return lastChange;
}

function remember(key: string, entry: Entry) {
  if (store.size >= MAX) store.delete(store.keys().next().value as string);
  store.set(key, entry);
}

function load<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const started = Date.now();
  const p = fn()
    .then(ownDomainDeep)
    .then(async (value) => {
      remember(key, { value, at: started });
      // Si hubo un cambio del CMS mientras se leía, no guardar copia vieja.
      if (started > lastChange) await writeShared(key, value, started);
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function serve<T>(key: string, hit: Entry, fn: () => Promise<T>): T {
  if (Date.now() - hit.at >= FRESH_MS && !hit.refreshing) {
    hit.refreshing = true;
    load(key, fn).catch(() => (hit.refreshing = false));
  }
  return hit.value as T;
}

export async function publicReadMemo<T>(
  key: string,
  fn: () => Promise<T>,
  options: { maxAgeMs?: number; staleWhileRevalidate?: boolean } = {},
): Promise<T> {
  if (typeof window !== "undefined") return fn();
  const local = store.get(key);
  // A cold server can read the shared copy and the CMS stamp together.
  // Await both before trusting the copy; invalidation is never bypassed.
  const changeRead = cmsChangedAt();
  const sharedRead = local ? null : readShared(key);
  const changed = await changeRead;
  const maxAge = options.maxAgeMs ?? STALE_MS;
  const reuse = (hit: Entry) =>
    options.staleWhileRevalidate === false ? (hit.value as T) : serve(key, hit, fn);
  if (local && local.at > changed && Date.now() - local.at < maxAge) return reuse(local);
  const shared = await (sharedRead ?? readShared(key));
  if (shared && shared.at > changed && Date.now() - shared.at < maxAge) {
    remember(key, shared);
    return reuse(shared);
  }
  return load(key, fn);
}

/**
 * Consulta una copia vigente sin leer de nuevo la fuente: la de este servidor
 * o la compartida, siempre posterior al último cambio del CMS y dentro de
 * `maxAgeMs`. Devuelve su antigüedad para que quien la entrega decida si
 * renovarla en segundo plano. Nunca arma la respuesta.
 */
export async function peekPublicReadMemo<T>(
  key: string,
  maxAgeMs: number,
): Promise<{ value: T; ageMs: number } | null> {
  if (typeof window !== "undefined") return null;
  const local = store.get(key);
  const changeRead = cmsChangedAt();
  const sharedRead = local ? null : readShared(key);
  const changed = await changeRead;
  const valid = (e: Entry | null | undefined): e is Entry =>
    !!e && e.at > changed && Date.now() - e.at < maxAgeMs;
  if (valid(local)) return { value: local.value as T, ageMs: Date.now() - local.at };
  const shared = await (sharedRead ?? readShared(key));
  if (!valid(shared)) return null;
  remember(key, shared);
  return { value: shared.value as T, ageMs: Date.now() - shared.at };
}

/** Igual que `queryClient.ensureQueryData`, pero en el servidor reutiliza la
 *  memoria breve y deja el resultado en la caché de la petición. */
export async function ensureMemoQuery<T>(
  qc: { ensureQueryData: (o: any) => Promise<any>; setQueryData: (k: any, v: any) => unknown },
  opts: { queryKey: readonly unknown[] },
): Promise<T> {
  if (typeof window !== "undefined") return qc.ensureQueryData(opts);
  const value = await publicReadMemo(`q:${JSON.stringify(opts.queryKey)}`, () =>
    qc.ensureQueryData(opts),
  );
  qc.setQueryData(opts.queryKey, value);
  return value as T;
}

export function __resetPublicReadMemo() {
  store.clear();
  inflight.clear();
  sharedReads.clear();
  lastChange = 0;
  checkedAt = 0;
}
