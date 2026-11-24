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
    };
  };
};

const MARGIN_MS = 10 * 60_000;
const MAX = 2000;
const memo = new Map<string, { url: string; exp: number }>();
const inflight = new Map<string, Promise<{ data: { signedUrl: string } | null; error: unknown }>>();

export async function signedUrlMemo(
  client: StorageClient,
  bucket: string,
  path: string,
  expiresIn: number,
): Promise<{ data: { signedUrl: string } | null; error: unknown }> {
  const key = `${bucket}\u0000${path}\u0000${expiresIn}`;
  const now = Date.now();
  const hit = memo.get(key);
  if (hit && hit.exp - now > MARGIN_MS) return { data: { signedUrl: hit.url }, error: null };
  const running = inflight.get(key);
  if (running) return running;
  const p = client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
    .then((res) => {
      if (res.data?.signedUrl && !res.error) {
        if (memo.size >= MAX) memo.delete(memo.keys().next().value as string);
        memo.set(key, { url: res.data.signedUrl, exp: Date.now() + expiresIn * 1000 });
      }
      return res;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
