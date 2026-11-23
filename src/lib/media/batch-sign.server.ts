/**
 * Firma muchas portadas privadas con una sola petición por bucket.
 *
 * Firmar una por una abre una petición por foto; con 200 empresas en un
 * destino eso agota el límite de peticiones del servidor. `createSignedUrls`
 * firma hasta cientos de rutas de una vez.
 */
export interface StorageObjectRef {
  bucket: string;
  path: string;
}

export function storageObjectKey(ref: StorageObjectRef): string {
  return `${ref.bucket}\u0000${ref.path}`;
}

const SIGN_BATCH = 500;

export async function signStorageObjects(
  refs: readonly StorageObjectRef[],
  expiresIn = 3600,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (refs.length === 0) return out;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const byBucket = new Map<string, Set<string>>();
  for (const r of refs) {
    if (!r.bucket || !r.path) continue;
    const set = byBucket.get(r.bucket) ?? new Set<string>();
    set.add(r.path);
    byBucket.set(r.bucket, set);
  }
  const jobs: Promise<void>[] = [];
  for (const [bucket, set] of byBucket) {
    const paths = [...set];
    for (let i = 0; i < paths.length; i += SIGN_BATCH) {
      const slice = paths.slice(i, i + SIGN_BATCH);
      jobs.push(
        supabaseAdmin.storage
          .from(bucket)
          .createSignedUrls(slice, expiresIn)
          .then(({ data }) => {
            for (const row of data ?? []) {
              if (row.path && row.signedUrl && !row.error) {
                out.set(storageObjectKey({ bucket, path: row.path }), row.signedUrl);
              }
            }
          })
          .catch(() => undefined),
      );
    }
  }
  await Promise.all(jobs);
  return out;
}
