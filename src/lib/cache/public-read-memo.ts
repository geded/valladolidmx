/**
 * Memoria breve en el servidor para lecturas públicas (anónimas) de las
 * páginas. Fresco 60 s; hasta 10 min devuelve la copia y la renueva en
 * segundo plano. En el navegador no guarda nada (siempre lee directo).
 */
type Entry = { value: unknown; at: number; refreshing?: boolean };
const FRESH_MS = 60_000;
const STALE_MS = 10 * 60_000;
const MAX = 500;
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

function load<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = fn()
    .then((value) => {
      if (store.size >= MAX) store.delete(store.keys().next().value as string);
      store.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function publicReadMemo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (typeof window !== "undefined") return fn();
  const hit = store.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < FRESH_MS) return Promise.resolve(hit.value as T);
  if (hit && age < STALE_MS) {
    if (!hit.refreshing) {
      hit.refreshing = true;
      load(key, fn).catch(() => (hit.refreshing = false));
    }
    return Promise.resolve(hit.value as T);
  }
  return load(key, fn);
}

export function __resetPublicReadMemo() {
  store.clear();
  inflight.clear();
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
