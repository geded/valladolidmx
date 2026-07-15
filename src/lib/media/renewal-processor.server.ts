/**
 * H3·A4 · M2.3.1 · Fase B · Procesador de lote (server-only).
 *
 * Reclama filas de `media_asset_signed_urls`, revalida server-side
 * contra `media_asset_variants` (regla §5/§6 Founder), firma con
 * deadline duro (250ms) y persiste vía `masu_upsert_monotonic`.
 *
 * Reglas vinculantes:
 *  - Sólo bucket `media-derived`.
 *  - Sólo asset piloto autorizado (`SHADOW_ALLOWLIST`).
 *  - Sólo variantes `is_current=true AND status='ready'`.
 *  - `variant_key` debe coincidir exactamente.
 *  - Filas históricas se purgan vía `masu_purge_stale`.
 *  - Nunca devuelve URLs firmadas ni paths a la respuesta HTTP.
 */

import { randomUUID } from "node:crypto";

export const RENEWAL_ASSET_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  "642cb15f-0a13-410c-8027-c4ab92034bf5",
]);
export const RENEWAL_BUCKET_ALLOWLIST: ReadonlySet<string> = new Set<string>(["media-derived"]);

export const SIGN_TTL_SECONDS = 60 * 60 * 24 * 7;       // 7 días
export const REFRESH_AFTER_SECONDS = Math.floor(SIGN_TTL_SECONDS / 2);
export const SERVABLE_MARGIN_SECONDS = 6 * 60 * 60;     // 6h (v1.2 §6)
// Deadline duro para el futuro fallback ON-DEMAND (Fase C). NO se aplica
// al renovador asíncrono, cuyo p95 real de `createSignedUrl` ≈475ms.
export const SIGN_ONDEMAND_DEADLINE_MS = 250;
// Renovador asíncrono: timeout por firma amplio, timeout total de lote
// y concurrencia limitada. Cancelación cooperativa vía AbortController.
export const SIGN_ASYNC_DEADLINE_MS   = 5_000;
export const BATCH_TOTAL_DEADLINE_MS  = 45_000;
export const RENEWAL_CONCURRENCY      = 4;
export const CLAIM_BATCH_MAX = 50;

export interface RenewalStats {
  claimed: number;
  applied: number;
  stale: number;
  failed: number;
  skipped_older: number;
}

interface ClaimedRow {
  variant_key: string;
  asset_id: string;
  variant_id: string;
  bucket: string;
  path: string;
  attempt_count: number;
  state: string;
}

interface CurrentVariantRow {
  id: string;
  asset_id: string;
  variant_key: string | null;
  is_current: boolean;
  status: string;
  bucket: string;
  path: string;
}

export async function runRenewalBatch(): Promise<RenewalStats> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const workerId = `renew:${randomUUID()}`;
  const stats: RenewalStats = { claimed: 0, applied: 0, stale: 0, failed: 0, skipped_older: 0 };

  const { data: claimedRaw, error: claimErr } = await supabaseAdmin.rpc(
    "masu_claim_renewal_batch",
    { _worker_id: workerId, _batch_size: CLAIM_BATCH_MAX, _lock_ttl: "5 minutes" },
  );
  if (claimErr) throw new Error("claim_failed");
  const claimed = (claimedRaw ?? []) as ClaimedRow[];
  stats.claimed = claimed.length;
  if (claimed.length === 0) return stats;

  const batchStart = Date.now();
  const batchAbort = new AbortController();
  const batchTimer = setTimeout(() => batchAbort.abort(), BATCH_TOTAL_DEADLINE_MS);

  const processOne = async (row: ClaimedRow) => {
    if (batchAbort.signal.aborted) {
      // Fail seguro: la fila queda con lock_expires; la máquina de
      // estados la volverá a reclamar en el siguiente ciclo.
      await supabaseAdmin.rpc("masu_record_failure", {
        _variant_key: row.variant_key,
        _error: "batch_deadline",
        _worker_id: workerId,
      });
      stats.failed++;
      return;
    }
    try {
      // §5 / §6 revalidación estricta contra la variante actual.
      if (
        !RENEWAL_BUCKET_ALLOWLIST.has(row.bucket) ||
        !RENEWAL_ASSET_ALLOWLIST.has(row.asset_id)
      ) {
        await supabaseAdmin.rpc("masu_purge_stale", { _variant_key: row.variant_key });
        stats.stale++;
        return;
      }
      const { data: variant, error: vErr } = await supabaseAdmin
        .from("media_asset_variants")
        .select("id, asset_id, variant_key, is_current, status, bucket, path")
        .eq("id", row.variant_id)
        .maybeSingle<CurrentVariantRow>();
      if (
        vErr ||
        !variant ||
        variant.is_current !== true ||
        variant.status !== "ready" ||
        variant.variant_key !== row.variant_key ||
        variant.bucket !== row.bucket ||
        variant.path !== row.path ||
        variant.asset_id !== row.asset_id ||
        !RENEWAL_BUCKET_ALLOWLIST.has(variant.bucket) ||
        !RENEWAL_ASSET_ALLOWLIST.has(variant.asset_id)
      ) {
        await supabaseAdmin.rpc("masu_purge_stale", { _variant_key: row.variant_key });
        stats.stale++;
        return;
      }

      // Renovador asíncrono: deadline amplio por firma (Founder §1 Fase B v1.1).
      const signed = await signWithDeadline(variant.bucket, variant.path, SIGN_ASYNC_DEADLINE_MS);
      if (!signed.ok) {
        await supabaseAdmin.rpc("masu_record_failure", {
          _variant_key: row.variant_key,
          _error: signed.reason,
          _worker_id: workerId,
        });
        stats.failed++;
        return;
      }

      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + SIGN_TTL_SECONDS * 1000);
      const refreshAfter = new Date(issuedAt.getTime() + REFRESH_AFTER_SECONDS * 1000);
      const servableUntil = new Date(expiresAt.getTime() - SERVABLE_MARGIN_SECONDS * 1000);

      const { data: upsert, error: uErr } = await supabaseAdmin.rpc("masu_upsert_monotonic", {
        _variant_key:    row.variant_key,
        _asset_id:       row.asset_id,
        _variant_id:     row.variant_id,
        _bucket:         variant.bucket,
        _path:           variant.path,
        _signed_url:     signed.url,
        _issued_at:      issuedAt.toISOString(),
        _expires_at:     expiresAt.toISOString(),
        _refresh_after:  refreshAfter.toISOString(),
        _servable_until: servableUntil.toISOString(),
        _worker_id:      workerId,
      });
      if (uErr) {
        await supabaseAdmin.rpc("masu_record_failure", {
          _variant_key: row.variant_key,
          _error: "upsert_error",
          _worker_id: workerId,
        });
        stats.failed++;
        return;
      }
      const applied = Array.isArray(upsert) && upsert[0]?.applied === true;
      if (applied) stats.applied++;
      else stats.skipped_older++;
    } catch {
      // Fail-closed: registrar sin propagar URLs ni errores internos.
      await supabaseAdmin.rpc("masu_record_failure", {
        _variant_key: row.variant_key,
        _error: "internal",
        _worker_id: workerId,
      });
      stats.failed++;
    }
  };

  // Pool de concurrencia limitada.
  const queue = [...claimed];
  const workers = Array.from({ length: Math.min(RENEWAL_CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0 && !batchAbort.signal.aborted) {
      const next = queue.shift();
      if (!next) break;
      await processOne(next);
    }
  });
  await Promise.all(workers);
  clearTimeout(batchTimer);
  // batchStart se registra en logs sanitizados externos si aplica.
  void batchStart;

  return stats;
}

async function signWithDeadline(
  bucket: string,
  path: string,
  deadlineMs: number,
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const race = await Promise.race([
      (async () => {
        const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGN_TTL_SECONDS);
        if (error) return { kind: "err" as const, reason: "sign_error" };
        if (!data?.signedUrl) return { kind: "err" as const, reason: "sign_error" };
        return { kind: "ok" as const, url: data.signedUrl };
      })(),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), deadlineMs);
      }),
    ]);
    if (race.kind === "ok") return { ok: true, url: race.url };
    if (race.kind === "timeout") return { ok: false, reason: "storage_timeout" };
    return { ok: false, reason: race.reason };
  } catch {
    return { ok: false, reason: "sign_error" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}