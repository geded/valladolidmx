/**
 * H3·A4 · M2.3 · Signed URL Cache (server-only, per-worker).
 *
 * Diseño:
 *  - LRU en memoria del worker. Nunca compartido, nunca persistido.
 *  - Clave: `variant_key` cuando existe; fallback `bucket:path`.
 *  - Entrada: firma opaca + `issuedAt`/`expiresAt` + tamaño estimado.
 *  - TTL solicitado a Storage: 7 días. Margen de seguridad: 300 s
 *    (ninguna entrada se devuelve si le queda menos que ese margen).
 *  - Single-flight (request coalescing): peticiones concurrentes al
 *    mismo `variant_key` disparan UNA sola llamada a Storage; el resto
 *    espera la misma promesa.
 *  - Firma por lote (`signBatch`) para amortizar múltiples solicitudes.
 *  - Invalidación por `variant_key` (o clave compuesta).
 *  - Ante cualquier error del caché o de la firma: NO propaga; el
 *    consumidor cae a legacy sin afectar el render.
 *  - La URL firmada JAMÁS abandona este módulo salvo por callers que
 *    la solicitan explícitamente vía `unsafeGetSignedUrl` (M2.4+); el
 *    shadow evaluator sólo consulta `probeSignedUrl` que descarta URL.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MediaFallbackReason } from "./resolve-source";

/** TTL solicitado a Storage. */
export const SIGN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días
/** Margen mínimo de vigencia. */
export const MIN_REMAINING_SECONDS = 300;
/** Umbral para renovar proactivamente. */
export const RENEW_AFTER_SECONDS = Math.floor(SIGN_TTL_SECONDS / 2);
/** Límite de entradas del caché per-worker. */
export const MAX_ENTRIES = 500;
/** Presupuesto de memoria aproximado (bytes). */
export const MAX_MEMORY_BYTES = 2 * 1024 * 1024;
/** Timeout duro de una operación de firma. */
export const SIGN_TIMEOUT_MS = 2000;

export interface SignCacheEntry {
  /** Nunca sale del módulo salvo vía `unsafeGetSignedUrl`. */
  signedUrl: string;
  issuedAt: number;
  expiresAt: number;
  bucket: string;
  path: string;
  /** Bytes aproximados para presupuesto de memoria. */
  weight: number;
}

export type SignResult =
  | {
      ok: true;
      latencyMs: number;
      cacheLookupMs: number;
      networkMs: number;
      source: "cache_hit" | "cache_miss" | "coalesced";
      issuedAt: number;
      expiresAt: number;
    }
  | {
      ok: false;
      latencyMs: number;
      cacheLookupMs: number;
      networkMs: number;
      source: "cache_hit" | "cache_miss" | "coalesced";
      reason: MediaFallbackReason;
    };

// ---------- LRU per-worker ----------

class LruCache {
  private map = new Map<string, SignCacheEntry>();
  private bytes = 0;

  get(key: string): SignCacheEntry | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    // Bump recency.
    this.map.delete(key);
    this.map.set(key, e);
    return e;
  }

  set(key: string, entry: SignCacheEntry): void {
    const existing = this.map.get(key);
    if (existing) {
      this.bytes -= existing.weight;
      this.map.delete(key);
    }
    this.map.set(key, entry);
    this.bytes += entry.weight;
    this.evict();
  }

  delete(key: string): boolean {
    const e = this.map.get(key);
    if (!e) return false;
    this.bytes -= e.weight;
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.bytes = 0;
  }

  size(): number {
    return this.map.size;
  }

  memoryBytes(): number {
    return this.bytes;
  }

  private evict(): void {
    while (this.map.size > MAX_ENTRIES || this.bytes > MAX_MEMORY_BYTES) {
      const oldestKey = this.map.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const e = this.map.get(oldestKey);
      if (e) this.bytes -= e.weight;
      this.map.delete(oldestKey);
    }
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }

  entries(): Array<[string, SignCacheEntry]> {
    return Array.from(this.map.entries());
  }
}

// Instancia per-worker.
const cache = new LruCache();
const inflight = new Map<string, Promise<SignCacheEntry>>();

// Contadores in-memory. Reseteados con `resetCacheStats` en tests/bench.
const stats = {
  hits: 0,
  misses: 0,
  coalesced: 0,
  errors: 0,
  expiredEvictions: 0,
  networkCalls: 0,
};

export function getCacheStats() {
  return { ...stats, size: cache.size(), memoryBytes: cache.memoryBytes() };
}
export function resetCacheStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.coalesced = 0;
  stats.errors = 0;
  stats.expiredEvictions = 0;
  stats.networkCalls = 0;
}
export function clearSignCache(): void {
  cache.clear();
  inflight.clear();
}

// ---------- API ----------

export interface SignRequest {
  bucket: string;
  path: string;
  /** Preferido: `variant_key` estable. Cae a `bucket:path` cuando falta. */
  variantKey?: string | null;
}

function cacheKeyOf(req: SignRequest): string {
  return req.variantKey && req.variantKey.length > 0 ? `vk:${req.variantKey}` : `bp:${req.bucket}:${req.path}`;
}

/** Invalida por `variant_key` — o por bucket/path si se pasa una clave compuesta. */
export function invalidateByVariantKey(variantKey: string): boolean {
  return cache.delete(`vk:${variantKey}`);
}
export function invalidateByBucketPath(bucket: string, path: string): boolean {
  return cache.delete(`bp:${bucket}:${path}`);
}

function isFresh(entry: SignCacheEntry, nowMs: number, marginSec = MIN_REMAINING_SECONDS): boolean {
  const remainingSec = Math.floor((entry.expiresAt - nowMs) / 1000);
  return remainingSec >= marginSec;
}

type NetworkSigner = (
  bucket: string,
  path: string,
) => Promise<{ ok: true; url: string } | { ok: false; reason: MediaFallbackReason }>;

const defaultSigner: NetworkSigner = async (bucket, path) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const race = await Promise.race([
      (async () => {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, SIGN_TTL_SECONDS);
        if (error || !data?.signedUrl) return { kind: "err" as const, reason: "signed_url_error" as MediaFallbackReason };
        return { kind: "ok" as const, url: data.signedUrl };
      })(),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), SIGN_TIMEOUT_MS);
      }),
    ]);
    if (race.kind === "ok") return { ok: true, url: race.url };
    if (race.kind === "timeout") return { ok: false, reason: "storage_unreachable" };
    return { ok: false, reason: race.reason };
  } catch {
    return { ok: false, reason: "signed_url_error" };
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export interface GetSignedOptions {
  /** Inyección para tests/benchmarks. */
  _signer?: NetworkSigner;
  /** Reloj inyectable (ms). */
  _now?: () => number;
  /** Margen mínimo requerido. */
  minRemainingSeconds?: number;
}

/**
 * Devuelve la entrada firmada, usando caché + single-flight.
 * `entry.signedUrl` NUNCA se propaga fuera del módulo.
 */
async function acquireEntry(
  req: SignRequest,
  opts: GetSignedOptions = {},
): Promise<{ entry: SignCacheEntry; source: "cache_hit" | "cache_miss" | "coalesced"; networkMs: number; cacheLookupMs: number }> {
  const now = opts._now ?? Date.now;
  const minMargin = opts.minRemainingSeconds ?? MIN_REMAINING_SECONDS;
  const key = cacheKeyOf(req);

  const t0 = now();
  const cached = cache.get(key);
  const cacheLookupMs = now() - t0;

  if (cached) {
    if (isFresh(cached, now(), minMargin)) {
      stats.hits++;
      return { entry: cached, source: "cache_hit", networkMs: 0, cacheLookupMs };
    }
    // Expirada o al margen: evict antes de rehacer.
    cache.delete(key);
    stats.expiredEvictions++;
  }

  // Single-flight.
  const inflightExisting = inflight.get(key);
  if (inflightExisting) {
    stats.coalesced++;
    const entry = await inflightExisting;
    return { entry, source: "coalesced", networkMs: 0, cacheLookupMs };
  }

  stats.misses++;
  const signer = opts._signer ?? defaultSigner;
  const netStart = now();
  const promise = (async () => {
    stats.networkCalls++;
    const res = await signer(req.bucket, req.path);
    if (!res.ok) {
      const err = new Error(res.reason);
      (err as Error & { reason?: MediaFallbackReason }).reason = res.reason;
      throw err;
    }
    const issuedAt = now();
    const entry: SignCacheEntry = {
      signedUrl: res.url,
      issuedAt,
      expiresAt: issuedAt + SIGN_TTL_SECONDS * 1000,
      bucket: req.bucket,
      path: req.path,
      weight: estimateWeight(res.url, req.bucket, req.path),
    };
    cache.set(key, entry);
    return entry;
  })();

  inflight.set(key, promise);
  try {
    const entry = await promise;
    return { entry, source: "cache_miss", networkMs: now() - netStart, cacheLookupMs };
  } finally {
    inflight.delete(key);
  }
}

function estimateWeight(url: string, bucket: string, path: string): number {
  // Cada char ≈ 2 bytes UTF-16 + overhead.
  return (url.length + bucket.length + path.length) * 2 + 96;
}

/**
 * Sonda de firma para el shadow evaluator: NO devuelve URL. Sólo métricas.
 * Un fallo NO propaga; siempre devuelve un `SignResult` legible.
 */
export async function probeSignedUrl(req: SignRequest, opts: GetSignedOptions = {}): Promise<SignResult> {
  const now = opts._now ?? Date.now;
  const t0 = now();
  try {
    const { entry, source, networkMs, cacheLookupMs } = await acquireEntry(req, opts);
    return {
      ok: true,
      latencyMs: now() - t0,
      cacheLookupMs,
      networkMs,
      source,
      issuedAt: entry.issuedAt,
      expiresAt: entry.expiresAt,
    };
  } catch (err) {
    stats.errors++;
    const reason = ((err as Error & { reason?: MediaFallbackReason }).reason ?? "signed_url_error") as MediaFallbackReason;
    return {
      ok: false,
      latencyMs: now() - t0,
      cacheLookupMs: 0,
      networkMs: 0,
      source: "cache_miss",
      reason,
    };
  }
}

/** Firma en lote — cada item se resuelve independientemente (single-flight per key). */
export async function probeSignedUrlBatch(items: SignRequest[], opts: GetSignedOptions = {}): Promise<SignResult[]> {
  return Promise.all(items.map((it) => probeSignedUrl(it, opts)));
}

/**
 * Reservado para M2.4+: devuelve la URL firmada real (para servirla al
 * navegador tras el flag global ON). En M2.3 NO se usa desde consumidores
 * públicos ni desde el shadow path.
 */
export async function unsafeGetSignedUrl(
  req: SignRequest,
  opts: GetSignedOptions = {},
): Promise<{ ok: true; url: string; source: SignResult["source"]; issuedAt: number; expiresAt: number } | { ok: false; reason: MediaFallbackReason }> {
  try {
    const { entry, source } = await acquireEntry(req, opts);
    return { ok: true, url: entry.signedUrl, source, issuedAt: entry.issuedAt, expiresAt: entry.expiresAt };
  } catch (err) {
    const reason = ((err as Error & { reason?: MediaFallbackReason }).reason ?? "signed_url_error") as MediaFallbackReason;
    return { ok: false, reason };
  }
}

/** Introspección para tests/benchmarks. */
export const __INSPECT__ = {
  cacheHas: (req: SignRequest) => cache.get(cacheKeyOf(req)) !== undefined,
  cacheKeys: () => cache.keys(),
  inflightSize: () => inflight.size,
};