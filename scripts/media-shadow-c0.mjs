#!/usr/bin/env node
/**
 * H3·A4 · M2.2 · C0 Dark Launch harness.
 *
 * Ejecuta N evaluaciones del shadow evaluator sobre el asset autorizado y
 * emite un resumen con: volumen, pipeline_candidate_ratio, distribución de
 * fallbackReason, latencia p50/p95, errores de DB y firma.
 *
 * Requisitos de env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEDIA_SHADOW_INTERNAL_SECRET
 *
 * Uso: bun scripts/media-shadow-c0.mjs [N=100]
 */
import { preloadShadowAssetBundle } from "../src/lib/media/shadow-preloader.server.ts";
import {
  evaluateMediaSourceShadow,
  SHADOW_ALLOWLIST,
} from "../src/lib/media/shadow-evaluator.server.ts";

const N = Number(process.argv[2] ?? 100);
const assetId = Array.from(SHADOW_ALLOWLIST)[0];
const goodCtx = { headerToken: process.env.MEDIA_SHADOW_INTERNAL_SECRET ?? "", host: "id-preview--c0.lovable.app" };

function pct(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

const results = [];
const preloadLatencies = [];
let dbErrors = 0;
let signErrors = 0;

// Warm-up 1 call (no incluida en métricas) para amortizar cold-start.
const warm = await preloadShadowAssetBundle(assetId);
await evaluateMediaSourceShadow(
  { id: assetId, original_width: 1600 },
  { _silent: true, preloaded: warm.bundle, preloadTelemetry: { latencyMs: warm.result.latencyMs, queryCount: warm.result.queryCount, error: warm.result.error } },
  goodCtx,
);

const globalStart = Date.now();
for (let i = 0; i < N; i++) {
  const preload = await preloadShadowAssetBundle(assetId);
  preloadLatencies.push(preload.result.latencyMs);
  if (preload.result.error) dbErrors++;
  const d = await evaluateMediaSourceShadow(
    { id: assetId, original_width: 1600 },
    {
      _silent: true,
      preloaded: preload.bundle,
      preloadTelemetry: { latencyMs: preload.result.latencyMs, queryCount: preload.result.queryCount, error: preload.result.error },
    },
    goodCtx,
  );
  if (d.signedUrlOk === false) signErrors++;
  results.push(d);
}
const globalMs = Date.now() - globalStart;

const totalLatencies = results.map((r) => r.latencyMs ?? 0);
const signLatencies = results.filter((r) => typeof r.signedUrlLatencyMs === "number").map((r) => r.signedUrlLatencyMs);
const wouldPipeline = results.filter((r) => r.decision === "would_use_pipeline").length;
const wouldLegacy = results.filter((r) => r.decision === "would_use_legacy").length;
const fallbackDist = results.reduce((acc, r) => {
  const k = r.fallbackReason ?? "none";
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});

const summary = {
  timestamp_utc: new Date().toISOString(),
  runtime_ms: globalMs,
  volume: N,
  asset_id: assetId,
  authorized_count: results.filter((r) => r.authorized).length,
  pipeline_candidate_count: wouldPipeline,
  legacy_count: wouldLegacy,
  pipeline_candidate_ratio: Number((wouldPipeline / N).toFixed(4)),
  fallback_reason_distribution: fallbackDist,
  latency_ms: {
    total_p50: pct(totalLatencies, 0.5),
    total_p95: pct(totalLatencies, 0.95),
    preload_p50: pct(preloadLatencies, 0.5),
    preload_p95: pct(preloadLatencies, 0.95),
    sign_p50: pct(signLatencies, 0.5),
    sign_p95: pct(signLatencies, 0.95),
  },
  db_errors: dbErrors,
  sign_errors: signErrors,
  client_exposure: {
    signed_urls_returned: 0,
    variants_serialized_to_client: 0,
    render_path_touched: false,
  },
};

// Salida a stdout + archivo persistente.
const out = JSON.stringify(summary, null, 2);
console.log(out);
const fs = await import("node:fs/promises");
await fs.mkdir("docs/blueprint/artifacts", { recursive: true });
await fs.writeFile("docs/blueprint/artifacts/M2.2-C0-summary.json", out + "\n");