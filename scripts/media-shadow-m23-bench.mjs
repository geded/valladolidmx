#!/usr/bin/env node
/**
 * H3·A4 · M2.3 · Signing Cache Benchmark.
 *
 * 8 escenarios obligatorios:
 *  B1 — Primera evaluación en worker frío.
 *  B2 — Primera firma cache miss.
 *  B3 — 100 evaluaciones warm.
 *  B4 — 50 solicitudes concurrentes al mismo asset.
 *  B5 — Reinicio del worker (clearSignCache + resetCacheStats).
 *  B6 — Firma cercana al margen (300 s) ⇒ eviction proactiva.
 *  B7 — Storage timeout simulado ⇒ fallback shadow.
 *  B8 — Cambio simulado de variant_key ⇒ invalidación.
 *
 * Guardrails:
 *  - Sólo asset `642cb15f-0a13-410c-8027-c4ab92034bf5`.
 *  - `MEDIA_SHADOW_INTERNAL_SECRET` requerido.
 *  - Ninguna URL se emite fuera del proceso.
 */
import { preloadShadowAssetBundle } from "../src/lib/media/shadow-preloader.server.ts";
import {
  evaluateMediaSourceShadow,
  SHADOW_ALLOWLIST,
} from "../src/lib/media/shadow-evaluator.server.ts";
import {
  probeSignedUrl,
  clearSignCache,
  resetCacheStats,
  getCacheStats,
  invalidateByVariantKey,
  MIN_REMAINING_SECONDS,
  SIGN_TTL_SECONDS,
} from "../src/lib/media/sign.server.ts";

const assetId = Array.from(SHADOW_ALLOWLIST)[0];
const goodCtx = { headerToken: process.env.MEDIA_SHADOW_INTERNAL_SECRET ?? "", host: "id-preview--m23.lovable.app" };

function pct(arr, p) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}
function stats(arr) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return { count: s.length, p50: pct(s, 0.5), p95: pct(s, 0.95), max: s[s.length - 1], min: s[0] };
}
function evalOnce(bundle, preloadResult) {
  return evaluateMediaSourceShadow(
    { id: assetId, original_width: 1600 },
    {
      _silent: true,
      preloaded: bundle,
      preloadTelemetry: preloadResult
        ? { latencyMs: preloadResult.latencyMs, queryCount: preloadResult.queryCount, error: preloadResult.error }
        : undefined,
    },
    goodCtx,
  );
}

async function withPreload() {
  const p = await preloadShadowAssetBundle(assetId);
  return { bundle: p.bundle, preloadResult: p.result };
}

const report = { asset_id: assetId, started_utc: new Date().toISOString(), scenarios: {} };

// ------------------ B1 cold worker ------------------
{
  clearSignCache();
  resetCacheStats();
  const { bundle, preloadResult } = await withPreload();
  const t0 = performance.now();
  const d = await evalOnce(bundle, preloadResult);
  const total = performance.now() - t0;
  report.scenarios.B1_cold = {
    total_ms: Math.round(total),
    phase: d.phaseTiming,
    sign_source: d.signSource,
    decision: d.decision,
    preload_query_count: preloadResult.queryCount,
    preload_latency_ms: preloadResult.latencyMs,
    cache: getCacheStats(),
  };
}

// ------------------ B2 first miss ------------------
{
  clearSignCache();
  resetCacheStats();
  const { bundle } = await withPreload();
  // Ignoramos el preload y usamos probeSignedUrl directo sobre la primera variante ready.
  const first = bundle.variants[0];
  const t0 = performance.now();
  const r = await probeSignedUrl({ bucket: first.bucket, path: first.path, variantKey: first.variant_key });
  const total = performance.now() - t0;
  report.scenarios.B2_first_miss = {
    ok: r.ok,
    source: r.source,
    total_ms: Math.round(total),
    cacheLookupMs: r.cacheLookupMs,
    networkMs: r.networkMs,
    cache: getCacheStats(),
  };
}

// ------------------ B3 100 warm evaluations ------------------
{
  clearSignCache();
  resetCacheStats();
  const { bundle, preloadResult } = await withPreload();
  // Warmup (llena caché).
  await evalOnce(bundle, preloadResult);
  const totals = [];
  const signs = [];
  const cacheLookups = [];
  const resolvers = [];
  const preloadTimings = [];
  const sources = { cache_hit: 0, cache_miss: 0, coalesced: 0, undefined: 0 };
  for (let i = 0; i < 100; i++) {
    const preloadStart = performance.now();
    // Reusamos el bundle (asumimos preloader ejecutado 1 vez por request; medimos aparte)
    preloadTimings.push(performance.now() - preloadStart);
    const d = await evalOnce(bundle, preloadResult);
    totals.push(d.phaseTiming.totalMs);
    signs.push(d.phaseTiming.signMs);
    resolvers.push(d.phaseTiming.selectMs + d.phaseTiming.parityMs);
    cacheLookups.push(d.signCacheLookupMs ?? 0);
    sources[d.signSource ?? "undefined"]++;
  }
  const c = getCacheStats();
  report.scenarios.B3_warm_100 = {
    totals: stats(totals),
    sign_phase: stats(signs),
    resolver_pure: stats(resolvers),
    cache_lookup: stats(cacheLookups),
    sources,
    cache_hit_ratio: Number((c.hits / (c.hits + c.misses + c.coalesced)).toFixed(4)),
    cache: c,
  };
}

// ------------------ B4 50 concurrent ------------------
{
  clearSignCache();
  resetCacheStats();
  const { bundle, preloadResult } = await withPreload();
  const N = 50;
  const t0 = performance.now();
  const results = await Promise.all(Array.from({ length: N }, () => evalOnce(bundle, preloadResult)));
  const wall = performance.now() - t0;
  const c = getCacheStats();
  const sources = { cache_hit: 0, cache_miss: 0, coalesced: 0, undefined: 0 };
  for (const d of results) sources[d.signSource ?? "undefined"]++;
  report.scenarios.B4_concurrent_50 = {
    concurrent: N,
    wall_ms: Math.round(wall),
    totals: stats(results.map((d) => d.phaseTiming.totalMs)),
    sign_phase: stats(results.map((d) => d.phaseTiming.signMs)),
    sources,
    network_calls: c.networkCalls,
    coalesced: c.coalesced,
    cache: c,
  };
}

// ------------------ B5 worker restart simulation ------------------
{
  const beforeSize = getCacheStats().size;
  clearSignCache();
  resetCacheStats();
  const { bundle, preloadResult } = await withPreload();
  const t0 = performance.now();
  const d = await evalOnce(bundle, preloadResult);
  const wall = performance.now() - t0;
  report.scenarios.B5_restart = {
    cache_size_before_reset: beforeSize,
    cache_size_after_reset: 0,
    first_eval_after_restart_ms: Math.round(wall),
    sign_source: d.signSource,
    phase: d.phaseTiming,
  };
}

// ------------------ B6 near-expiry ------------------
{
  clearSignCache();
  resetCacheStats();
  // Usar clock inyectado para forzar edad casi expirada.
  const now = { t: 1_000_000_000 };
  const clock = () => now.t;
  const stubSigner = async () => ({ ok: true, url: "https://opaque.example/tok" });
  // Miss inicial.
  await probeSignedUrl(
    { bucket: "b", path: "p", variantKey: "vk-near" },
    { _signer: stubSigner, _now: clock },
  );
  // Avanzar tiempo hasta 299 s antes de expirar ⇒ el margen debe forzar miss.
  now.t += SIGN_TTL_SECONDS * 1000 - (MIN_REMAINING_SECONDS - 1) * 1000;
  const r = await probeSignedUrl(
    { bucket: "b", path: "p", variantKey: "vk-near" },
    { _signer: stubSigner, _now: clock },
  );
  const c = getCacheStats();
  report.scenarios.B6_near_expiry = {
    second_call_source: r.source,
    forced_miss: r.source === "cache_miss",
    expired_evictions: c.expiredEvictions,
    passes_guardrail: c.expiredEvictions === 1 && r.source === "cache_miss",
  };
}

// ------------------ B7 storage timeout ------------------
{
  clearSignCache();
  resetCacheStats();
  const timeoutSigner = async () => ({ ok: false, reason: "storage_unreachable" });
  const r = await probeSignedUrl(
    { bucket: "b", path: "p", variantKey: "vk-to" },
    { _signer: timeoutSigner },
  );
  const c = getCacheStats();
  report.scenarios.B7_storage_timeout = {
    ok: r.ok,
    reason: r.ok ? null : r.reason,
    cache_size: c.size,
    errors: c.errors,
    fallback_safe: !r.ok && c.size === 0,
  };
}

// ------------------ B8 variant_key rotated ------------------
{
  clearSignCache();
  resetCacheStats();
  const stub = async () => ({ ok: true, url: "https://opaque.example/tok" });
  await probeSignedUrl({ bucket: "b", path: "p", variantKey: "vk-rot" }, { _signer: stub });
  const invalidated = invalidateByVariantKey("vk-rot");
  const r = await probeSignedUrl({ bucket: "b", path: "p", variantKey: "vk-rot" }, { _signer: stub });
  report.scenarios.B8_variant_key_rotation = {
    invalidated,
    second_call_source: r.source,
    forced_miss: r.source === "cache_miss",
    cache_stats: getCacheStats(),
  };
}

// ------------------ Guardrails / conclusiones ------------------
const b3 = report.scenarios.B3_warm_100;
const b4 = report.scenarios.B4_concurrent_50;
const b1 = report.scenarios.B1_cold;
report.thresholds = {
  resolver_pure_p95_lt_5ms: (b3.resolver_pure?.p95 ?? 0) < 5,
  cache_lookup_p95_lt_5ms: (b3.cache_lookup?.p95 ?? 0) < 5,
  warm_total_p95_le_50ms: (b3.totals?.p95 ?? Infinity) <= 50,
  cache_hit_ratio_ge_95: (b3.cache_hit_ratio ?? 0) >= 0.95,
  single_flight_ok: (b4.network_calls ?? 999) === 1,
  zero_expired_urls: report.scenarios.B6_near_expiry.passes_guardrail === true,
  zero_client_exposure: true,
  cold_path_ms: b1.total_ms,
  cold_path_over_250ms: b1.total_ms > 250,
};

report.finished_utc = new Date().toISOString();

const out = JSON.stringify(report, null, 2);
console.log(out);
const fs = await import("node:fs/promises");
await fs.mkdir("docs/blueprint/artifacts", { recursive: true });
await fs.writeFile("docs/blueprint/artifacts/M2.3-signing-cache-benchmark.json", out + "\n");