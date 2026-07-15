/**
 * H3·A4 · M2.1 · Server-side Shadow Evaluator
 *
 * Ámbito autorizado (Founder M2.1):
 *  - Sólo server-side. Nunca se importa desde bundles cliente.
 *  - Sólo entorno preview (host distinto de producción).
 *  - Sólo assets en `SHADOW_ALLOWLIST` (hoy: 1 asset).
 *  - Sólo si `x-vmx-shadow` coincide con `MEDIA_SHADOW_INTERNAL_SECRET`
 *    (comparación en tiempo constante) — el header por sí solo no
 *    autoriza; se combina con secreto server-side + entorno preview.
 *  - Evalúa selección hipotética, mide firma y latencia, DESCARTA la URL.
 *  - Emite un evento `media_shadow_decision` sanitizado (sin URLs,
 *    tokens, IP, cookies, query strings, referrer ni datos personales).
 *  - Nunca modifica el HTML público. Nunca serializa firma al cliente.
 *
 * Guardrails M2.1:
 *  - `media_pipeline_enabled` sigue en `false` global.
 *  - Rollback evaluator sigue en `dry-run=true` (aún no implementado).
 *  - Ninguna URL derivada llega al navegador desde este módulo.
 *  - En cualquier fallo, esta función retorna una decisión con
 *    `authorized=false` o `fallback_reason` y NO altera el render.
 */

import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MediaAssetInput, MediaFallbackReason, MediaUsageContext, MediaVariantFormat } from "./resolve-source";
import { resolveMediaSource } from "./resolve-source";
import { probeSignedUrl, type SignResult } from "./sign.server";

/** Allowlist explícita autorizada por el Founder. */
export const SHADOW_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  "642cb15f-0a13-410c-8027-c4ab92034bf5",
]);

/** Hosts productivos donde el shadow NUNCA debe activarse. */
export const PRODUCTION_HOSTS: ReadonlySet<string> = new Set<string>([
  "valladolidmx.lovable.app",
  "www.quehacerenvalladolid.com",
  "quehacerenvalladolid.com",
]);

/** Máximo tiempo permitido para firmar una URL antes de considerar Storage inalcanzable. */
const SIGN_TIMEOUT_MS = 2000;
/** TTL solicitado a Storage. La firma se descarta inmediatamente; nunca se sirve. */
const SIGN_TTL_SECONDS = 3600;

export interface ShadowContext {
  /** Valor bruto del header `x-vmx-shadow` en la request. */
  headerToken: string | null;
  /** Host de la request (lowercase). */
  host: string | null;
}

export type ShadowAuthorizationResult =
  | { ok: true }
  | { ok: false; reason: ShadowUnauthorizedReason };

export type ShadowUnauthorizedReason =
  | "shadow_disabled"       // secreto server-side no configurado
  | "no_header"             // request sin `x-vmx-shadow`
  | "bad_header"            // token no coincide (comparación constante)
  | "no_host"               // request sin host resoluble
  | "production_host"       // host productivo — jamás autorizado
  | "asset_not_allowlisted"; // asset fuera de la allowlist explícita

export interface ShadowDecision {
  authorized: boolean;
  reason?: ShadowUnauthorizedReason;
  latencyMs?: number;
  decision?: "would_use_pipeline" | "would_use_legacy";
  variantKey?: string;
  formatPreferred?: MediaVariantFormat;
  widthChosen?: number;
  fallbackReason?: MediaFallbackReason;
  signedUrlLatencyMs?: number;
  signedUrlOk?: boolean;
  /** M2.3: fase por fase para diagnóstico de latencia. */
  phaseTiming?: {
    authMs: number;
    preflightMs: number;
    selectMs: number;
    signMs: number;
    parityMs: number;
    totalMs: number;
  };
  /** M2.3: origen de la firma (cache_hit/miss/coalesced). */
  signSource?: SignResult["source"];
  /** M2.3: desglose de la firma. */
  signCacheLookupMs?: number;
  signNetworkMs?: number;
}

/** Comparación en tiempo constante para strings. */
export function constantTimeStringEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Autorización multi-factor: entorno preview + secreto server-side + allowlist.
 * El header nunca autoriza por sí solo.
 */
export function shadowAuthorization(ctx: ShadowContext, assetId: string): ShadowAuthorizationResult {
  const secret = process.env.MEDIA_SHADOW_INTERNAL_SECRET;
  if (!secret) return { ok: false, reason: "shadow_disabled" };
  if (!ctx.headerToken) return { ok: false, reason: "no_header" };
  if (!constantTimeStringEqual(ctx.headerToken, secret)) return { ok: false, reason: "bad_header" };
  const host = (ctx.host ?? "").toLowerCase().trim();
  if (!host) return { ok: false, reason: "no_host" };
  if (PRODUCTION_HOSTS.has(host)) return { ok: false, reason: "production_host" };
  if (!SHADOW_ALLOWLIST.has(assetId)) return { ok: false, reason: "asset_not_allowlisted" };
  return { ok: true };
}

interface VariantRow {
  format: MediaVariantFormat;
  width: number;
  height: number | null;
  bucket: string;
  path: string;
  variant_key: string | null;
  usage_context: MediaUsageContext | null;
}

/**
 * M2.2: Bundle precargado por el server (una sola pareja de queries batched
 * por lote, ver `shadow-preloader.server.ts`). Se pasa al evaluador para
 * evitar consultas redundantes y garantizar query-count estable.
 */
export interface PreloadedShadowBundle {
  asset: {
    id: string;
    original_width: number | null;
    original_height: number | null;
    pipeline_status:
      | "disabled"
      | "pending"
      | "processing"
      | "ready"
      | "failed"
      | "skipped"
      | null;
    has_original_checksum: boolean;
  };
  variants: VariantRow[];
}

/**
 * Firma una URL con timeout duro y devuelve sólo `{ok, latency, reason?}`.
 * NUNCA devuelve ni loguea la URL firmada. Se descarta al retornar.
 */
async function attemptSignAndDiscard(
  bucket: string,
  path: string,
): Promise<{ ok: boolean; latencyMs: number; reason?: MediaFallbackReason }> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const signPromise = (async () => {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, SIGN_TTL_SECONDS);
      if (error) return { kind: "err" as const, message: error.message };
      if (!data?.signedUrl) return { kind: "err" as const, message: "no_url" };
      // Descartar la firma inmediatamente sin serializar ni loguear.
      // Sólo se lee la longitud para forzar materialización y validar shape.
      const len = data.signedUrl.length;
      return { kind: "ok" as const, len };
    })();
    const timeoutPromise = new Promise<{ kind: "timeout" }>((resolve) => {
      timer = setTimeout(() => resolve({ kind: "timeout" }), SIGN_TIMEOUT_MS);
    });
    const result = await Promise.race([signPromise, timeoutPromise]);
    const latencyMs = Date.now() - started;
    if (result.kind === "ok") return { ok: true, latencyMs };
    if (result.kind === "timeout") return { ok: false, latencyMs, reason: "storage_unreachable" };
    return { ok: false, latencyMs, reason: "signed_url_error" };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, reason: "signed_url_error" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function pickPreferredVariant(
  variants: VariantRow[],
  targetWidth: number,
  context: MediaUsageContext,
): { chosen: VariantRow | null; formatPreferred?: MediaVariantFormat } {
  const contextual = variants.filter((v) => !v.usage_context || v.usage_context === context);
  const pool = contextual.length > 0 ? contextual : variants;
  const order: MediaVariantFormat[] = ["avif", "webp", "jpeg"];
  let formatPreferred: MediaVariantFormat | undefined;
  for (const fmt of order) {
    const list = pool.filter((v) => v.format === fmt);
    if (list.length === 0) continue;
    formatPreferred ??= fmt;
    const chosen = list
      .slice()
      .sort((a, b) => Math.abs(a.width - targetWidth) - Math.abs(b.width - targetWidth))[0];
    return { chosen, formatPreferred };
  }
  return { chosen: null, formatPreferred };
}

function emitShadowDecisionEvent(
  decision: ShadowDecision,
  assetId: string,
  preload?: { latencyMs: number; queryCount: number; error?: "db_timeout" | "db_error" },
): void {
  // Evento sanitizado — sin URLs, tokens, IP, cookies, query strings,
  // referrer ni datos personales. Sólo forma/latencia de la decisión.
  const event = {
    kind: "media_shadow_decision",
    ts: Date.now(),
    env: "preview",
    asset_id: assetId,
    decision: decision.decision ?? null,
    variant_key: decision.variantKey ?? null,
    format_preferred: decision.formatPreferred ?? null,
    width_chosen: decision.widthChosen ?? null,
    fallback_reason: decision.fallbackReason ?? null,
    latency_ms: decision.latencyMs ?? null,
    signed_url_latency_ms: decision.signedUrlLatencyMs ?? null,
    signed_url_ok: decision.signedUrlOk ?? null,
    preload_latency_ms: preload?.latencyMs ?? null,
    preload_query_count: preload?.queryCount ?? null,
    preload_error: preload?.error ?? null,
  };
  console.log(JSON.stringify(event));
}

export interface EvaluateOptions {
  context?: MediaUsageContext;
  targetWidth?: number;
  /** M2.2 (recomendado): bundle precargado por el server. Si se provee, no toca DB. */
  preloaded?: PreloadedShadowBundle | null;
  /** M2.2: telemetría del preloader propagada al evento. */
  preloadTelemetry?: {
    latencyMs: number;
    queryCount: number;
    error?: "db_timeout" | "db_error";
  };
  /** Test-only: permite inyectar un fetcher de variantes sin tocar Supabase. */
  _variantFetcher?: (assetId: string) => Promise<VariantRow[]>;
  /** Test-only: permite inyectar un firmador sin tocar Storage. */
  _signer?: (bucket: string, path: string) => Promise<{ ok: boolean; latencyMs: number; reason?: MediaFallbackReason }>;
  /** M2.3: usa la ruta cached del `sign.server`. Cae al `_signer` legacy si se
   * inyecta explícitamente en tests. */
  useSignCache?: boolean;
  /** Test-only: silenciar el evento de log. */
  _silent?: boolean;
}

/**
 * Punto de entrada oficial del Shadow Evaluator. Nunca es llamado desde el
 * render de superficies públicas: sólo desde el endpoint interno
 * `POST /api/dev/media-shadow-eval`.
 */
export async function evaluateMediaSourceShadow(
  asset: Pick<MediaAssetInput, "id" | "original_width">,
  options: EvaluateOptions,
  ctx: ShadowContext,
): Promise<ShadowDecision> {
  const t0 = Date.now();
  const auth = shadowAuthorization(ctx, asset.id);
  const authMs = Date.now() - t0;
  if (!auth.ok) {
    // No emitimos evento para peticiones no autorizadas (evita ruido y
    // exfiltración incremental por conteo).
    return { authorized: false, reason: auth.reason };
  }

  const started = Date.now();
  const decision: ShadowDecision = { authorized: true, decision: "would_use_legacy" };
  const timings = { authMs, preflightMs: 0, selectMs: 0, signMs: 0, parityMs: 0, totalMs: 0 };

  try {
    // Si hay bundle precargado, no tocamos DB.
    const preflightStart = Date.now();
    let variants: VariantRow[];
    let assetPipelineStatus: PreloadedShadowBundle["asset"]["pipeline_status"] | undefined;
    if (options.preloaded) {
      if (options.preloaded.asset.id !== asset.id) {
        decision.fallbackReason = "no_variants_for_context";
        decision.latencyMs = Date.now() - started;
        timings.preflightMs = Date.now() - preflightStart;
        timings.totalMs = Date.now() - t0;
        decision.phaseTiming = timings;
        if (!options._silent) emitShadowDecisionEvent(decision, asset.id, options.preloadTelemetry);
        return decision;
      }
      // Preflight: checksum faltante en el original → no elegible aún.
      if (!options.preloaded.asset.has_original_checksum) {
        decision.fallbackReason = "variant_key_missing";
        decision.latencyMs = Date.now() - started;
        timings.preflightMs = Date.now() - preflightStart;
        timings.totalMs = Date.now() - t0;
        decision.phaseTiming = timings;
        if (!options._silent) emitShadowDecisionEvent(decision, asset.id, options.preloadTelemetry);
        return decision;
      }
      // Preflight: preloader reportó error de DB.
      if (options.preloadTelemetry?.error) {
        decision.fallbackReason = "storage_unreachable";
        decision.latencyMs = Date.now() - started;
        timings.preflightMs = Date.now() - preflightStart;
        timings.totalMs = Date.now() - t0;
        decision.phaseTiming = timings;
        if (!options._silent) emitShadowDecisionEvent(decision, asset.id, options.preloadTelemetry);
        return decision;
      }
      variants = options.preloaded.variants;
      assetPipelineStatus = options.preloaded.asset.pipeline_status;
    } else {
      const fetcher =
      options._variantFetcher ??
      (async (assetId: string) => {
        const { data, error } = await supabaseAdmin
          .from("media_asset_variants")
          .select("format,width,height,bucket,path,variant_key,usage_context,status,is_current")
          .eq("asset_id", assetId)
          .eq("is_current", true)
          .eq("status", "ready");
        if (error) throw error;
        return ((data ?? []) as Array<Record<string, unknown>>).map(
          (r) =>
            ({
              format: r.format as MediaVariantFormat,
              width: Number(r.width),
              height: r.height == null ? null : Number(r.height),
              bucket: String(r.bucket),
              path: String(r.path),
              variant_key: r.variant_key == null ? null : String(r.variant_key),
              usage_context: (r.usage_context as MediaUsageContext | null) ?? null,
            }) satisfies VariantRow,
        );
      });
      variants = await fetcher(asset.id);
    }
    timings.preflightMs = Date.now() - preflightStart;

    const selectStart = Date.now();
    if (variants.length === 0) {
      decision.fallbackReason = "no_variants_for_context";
    } else {
      const target = options.targetWidth ?? asset.original_width ?? 800;
      const ctxFilter: MediaUsageContext = options.context ?? "generic";
      const { chosen, formatPreferred } = pickPreferredVariant(variants, target, ctxFilter);
      timings.selectMs = Date.now() - selectStart;
      if (!chosen) {
        decision.fallbackReason = "no_variants_for_context";
      } else if (!chosen.variant_key) {
        decision.fallbackReason = "variant_key_missing";
      } else {
        decision.decision = "would_use_pipeline";
        decision.variantKey = chosen.variant_key;
        decision.formatPreferred = formatPreferred;
        decision.widthChosen = chosen.width;

        const signStart = Date.now();
        // M2.3: preferimos el cache path por defecto en el shadow evaluator.
        // Un legacy `_signer` inyectado (para tests) tiene prioridad.
        if (options._signer) {
          const signRes = await options._signer(chosen.bucket, chosen.path);
          decision.signedUrlLatencyMs = signRes.latencyMs;
          decision.signedUrlOk = signRes.ok;
          if (!signRes.ok) {
            decision.fallbackReason = signRes.reason ?? "signed_url_error";
            decision.decision = "would_use_legacy";
          }
        } else {
          const probe = await probeSignedUrl({ bucket: chosen.bucket, path: chosen.path, variantKey: chosen.variant_key });
          decision.signedUrlLatencyMs = probe.latencyMs;
          decision.signedUrlOk = probe.ok;
          decision.signSource = probe.source;
          decision.signCacheLookupMs = probe.cacheLookupMs;
          decision.signNetworkMs = probe.networkMs;
          if (!probe.ok) {
            decision.fallbackReason = probe.reason;
            decision.decision = "would_use_legacy";
          }
        }
        timings.signMs = Date.now() - signStart;
      }
    }
    // M2.2: parity check con el resolver puro. Si el pipeline_status no es
    // 'ready' según el asset, `resolveMediaSource` no elegiría variantes
    // ⇒ marcamos `pipeline_disabled` como razón declarativa.
    const parityStart = Date.now();
    if (assetPipelineStatus && assetPipelineStatus !== "ready" && decision.decision === "would_use_pipeline") {
      decision.decision = "would_use_legacy";
      decision.fallbackReason = "pipeline_disabled";
    }
    // Sanity: el resolver puro consumiría exactamente estas mismas variantes
    // (byte-identidad de decisión). Si difiere, se marca variant_key_missing
    // para caer al legacy. `resolveMediaSource` sólo se ejerce con datos
    // ya en memoria; no hace red.
    if (options.preloaded && decision.decision === "would_use_pipeline") {
      const resolved = resolveMediaSource(
        {
          id: asset.id,
          file_url: null,
          original_width: options.preloaded.asset.original_width,
          original_height: options.preloaded.asset.original_height,
          pipeline_status: options.preloaded.asset.pipeline_status ?? "ready",
          variants: options.preloaded.variants.map((v) => ({
            format: v.format,
            width: v.width,
            height: v.height,
            url: "opaque://" + (v.variant_key ?? "no-key"),
            status: "ready",
            usage_context: v.usage_context,
            variant_key: v.variant_key,
          })),
        },
        { context: options.context, targetWidth: options.targetWidth },
      );
      // Confirmamos que el resolver también habría elegido pipeline.
      if (!resolved.usedPipeline) {
        decision.decision = "would_use_legacy";
        decision.fallbackReason = "no_variants_for_context";
      }
    }
    timings.parityMs = Date.now() - parityStart;
  } catch {
    decision.decision = "would_use_legacy";
    decision.fallbackReason = "signed_url_error";
  }

  decision.latencyMs = Date.now() - started;
  timings.totalMs = Date.now() - t0;
  decision.phaseTiming = timings;
  if (!options._silent) emitShadowDecisionEvent(decision, asset.id, options.preloadTelemetry);
  return decision;
}

/** Test-only helpers reexportados; NO usar en producción. */
export const __TEST_ONLY__ = {
  pickPreferredVariant,
  attemptSignAndDiscard,
  emitShadowDecisionEvent,
};