/**
 * Memoria breve de enlaces firmados para lecturas públicas: la misma foto ya
 * firmada se reutiliza mientras le queden más de 10 minutos, en vez de pedir
 * otra firma en cada visita. Misma forma de respuesta que createSignedUrl.
 */
type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
      createSignedUrls?: (
        paths: string[],
        expiresIn: number,
      ) => Promise<{
        data: Array<{ path: string | null; signedUrl: string | null; error?: unknown }> | null;
        error: unknown;
      }>;
    };
  };
};

// Las páginas públicas guardan estos enlaces hasta 30 min (copia stale) más
// hasta 10 min en el borde: cada enlace entregado debe vivir más que eso.
const MARGIN_MS = 45 * 60_000;
const MIN_TTL_S = 2 * 60 * 60;
const MAX = 2000;
import { toOwnDomainSignedUrl } from "./own-domain-signed";
const memo = new Map<string, { url: string; exp: number }>();
const inflight = new Map<string, Promise<{ data: { signedUrl: string } | null; error: unknown }>>();

export async function signedUrlMemo(
  client: StorageClient,
  bucket: string,
  path: string,
  requested: number,
): Promise<{ data: { signedUrl: string } | null; error: unknown }> {
  const expiresIn = Math.max(requested, MIN_TTL_S);
  const key = `${bucket}\u0000${path}\u0000${expiresIn}`;
  const now = Date.now();
  const hit = memo.get(key);
  if (hit && hit.exp - now > MARGIN_MS) return { data: { signedUrl: hit.url }, error: null };
  const running = inflight.get(key);
  if (running) return running;
  const p = client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
    .then((r) => {
      let res = r;
      if (res.data?.signedUrl && !res.error) {
        const own = toOwnDomainSignedUrl(res.data.signedUrl);
        res = { ...res, data: { signedUrl: own } };
        if (memo.size >= MAX) memo.delete(memo.keys().next().value as string);
        memo.set(key, { url: own, exp: Date.now() + expiresIn * 1000 });
      }
      return res;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/**
 * Firma varias fotos a la vez: las ya firmadas salen de la memoria y las
 * faltantes se piden en UNA sola llamada por bucket (no una por foto).
 * Devuelve las URLs en el mismo orden; `null` si una no se pudo firmar.
 */
export async function signedUrlsMemo(
  client: StorageClient,
  items: ReadonlyArray<{ bucket: string; path: string }>,
  requested: number,
): Promise<Array<string | null>> {
  const expiresIn = Math.max(requested, MIN_TTL_S);
  const now = Date.now();
  const out: Array<string | null> = items.map(() => null);
  const missing = new Map<string, Array<{ i: number; path: string }>>();
  items.forEach((it, i) => {
    const hit = memo.get(`${it.bucket}\u0000${it.path}\u0000${expiresIn}`);
    if (hit && hit.exp - now > MARGIN_MS) out[i] = hit.url;
    else {
      const list = missing.get(it.bucket) ?? [];
      list.push({ i, path: it.path });
      missing.set(it.bucket, list);
    }
  });
  await Promise.all(
    [...missing].map(async ([bucket, list]) => {
      const api = client.storage.from(bucket);
      if (!api.createSignedUrls) {
        const res = await Promise.all(
          list.map((m) => signedUrlMemo(client, bucket, m.path, expiresIn).catch(() => null)),
        );
        res.forEach((r, k) => (out[list[k]!.i] = r?.data?.signedUrl ?? null));
        return;
      }
      const uniq = [...new Set(list.map((m) => m.path))];
      const { data } = await api.createSignedUrls(uniq, expiresIn).catch(() => ({ data: null }));
      const byPath = new Map<string, string>();
      for (const row of data ?? []) {
        if (row.path && row.signedUrl && !row.error) {
          byPath.set(row.path, toOwnDomainSignedUrl(row.signedUrl));
          if (memo.size >= MAX) memo.delete(memo.keys().next().value as string);
          memo.set(`${bucket}\u0000${row.path}\u0000${expiresIn}`, {
            url: toOwnDomainSignedUrl(row.signedUrl),
            exp: Date.now() + expiresIn * 1000,
          });
        }
      }
      for (const m of list) out[m.i] = byPath.get(m.path) ?? null;
    }),
  );
  return out;
}
