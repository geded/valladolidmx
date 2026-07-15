/**
 * H3·A4 · M2.1 · Unit + contract tests para el Shadow Evaluator.
 * Ejecutar con: `bun test scripts/shadow-evaluator.test.ts`
 *
 * Cubre:
 *  A. Autorización (header, secreto, host, allowlist).
 *  B. Selección de variante (contexto, formato, ancho más cercano).
 *  C. Fallback reasons (no variants, variant_key faltante, storage timeout, sign error).
 *  D. Sanitización del evento: sin URLs, sin tokens, sólo forma/latencia.
 *  E. Contrato aditivo de `resolveMediaSource` (byte-identidad de salida
 *     cuando no hay pipeline listo — el render legacy sigue idéntico).
 *  F. Ausencia de URLs firmadas en la respuesta del evaluador.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  constantTimeStringEqual,
  evaluateMediaSourceShadow,
  shadowAuthorization,
  SHADOW_ALLOWLIST,
  __TEST_ONLY__,
  type ShadowContext,
} from "../src/lib/media/shadow-evaluator.server";
import { resolveMediaSource, type MediaAssetInput } from "../src/lib/media/resolve-source";

const ASSET = "642cb15f-0a13-410c-8027-c4ab92034bf5";
const SECRET = "unit-test-secret-value-do-not-use-in-prod";

const goodCtx: ShadowContext = { headerToken: SECRET, host: "id-preview--foo.lovable.app" };

beforeEach(() => {
  process.env.MEDIA_SHADOW_INTERNAL_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.MEDIA_SHADOW_INTERNAL_SECRET;
});

describe("A. constantTimeStringEqual", () => {
  test("equal strings", () => expect(constantTimeStringEqual("abc", "abc")).toBe(true));
  test("different length", () => expect(constantTimeStringEqual("abc", "abcd")).toBe(false));
  test("different value", () => expect(constantTimeStringEqual("abc", "abd")).toBe(false));
  test("non-strings rejected", () =>
    expect(constantTimeStringEqual(null as never, "abc")).toBe(false));
});

describe("A. shadowAuthorization", () => {
  test("rejects when secret env is missing", () => {
    delete process.env.MEDIA_SHADOW_INTERNAL_SECRET;
    const r = shadowAuthorization(goodCtx, ASSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("shadow_disabled");
  });
  test("rejects missing header", () => {
    const r = shadowAuthorization({ headerToken: null, host: goodCtx.host }, ASSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_header");
  });
  test("rejects wrong header", () => {
    const r = shadowAuthorization({ headerToken: "nope", host: goodCtx.host }, ASSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_header");
  });
  test("rejects production host", () => {
    const r = shadowAuthorization({ headerToken: SECRET, host: "valladolidmx.lovable.app" }, ASSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("production_host");
  });
  test("rejects production custom domain", () => {
    const r = shadowAuthorization({ headerToken: SECRET, host: "www.quehacerenvalladolid.com" }, ASSET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("production_host");
  });
  test("rejects asset not in allowlist", () => {
    const r = shadowAuthorization(goodCtx, "00000000-0000-0000-0000-000000000000");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("asset_not_allowlisted");
  });
  test("allows preview host + valid header + allowlisted asset", () => {
    const r = shadowAuthorization(goodCtx, ASSET);
    expect(r.ok).toBe(true);
  });
  test("allowlist exposes exactly one asset (M2.1)", () => {
    expect(SHADOW_ALLOWLIST.size).toBe(1);
    expect(SHADOW_ALLOWLIST.has(ASSET)).toBe(true);
  });
});

describe("B. pickPreferredVariant", () => {
  const rows = [
    { format: "avif", width: 400, height: 600, bucket: "b", path: "p1", variant_key: "vk1", usage_context: null },
    { format: "avif", width: 1200, height: 1800, bucket: "b", path: "p2", variant_key: "vk2", usage_context: null },
    { format: "webp", width: 800, height: 1200, bucket: "b", path: "p3", variant_key: "vk3", usage_context: null },
    { format: "jpeg", width: 800, height: 1200, bucket: "b", path: "p4", variant_key: "vk4", usage_context: null },
  ] as never;
  test("prefers AVIF over WebP/JPEG", () => {
    const r = __TEST_ONLY__.pickPreferredVariant(rows, 800, "generic");
    expect(r.formatPreferred).toBe("avif");
    expect(r.chosen?.format).toBe("avif");
  });
  test("picks width closest to target", () => {
    const r = __TEST_ONLY__.pickPreferredVariant(rows, 1000, "generic");
    expect(r.chosen?.width).toBe(1200);
  });
  test("returns null on empty pool", () => {
    const r = __TEST_ONLY__.pickPreferredVariant([], 800, "generic");
    expect(r.chosen).toBeNull();
  });
});

describe("C. evaluateMediaSourceShadow — fallback reasons", () => {
  const asset = { id: ASSET, original_width: 1600 };

  test("returns unauthorized when auth fails (no event emitted)", async () => {
    const d = await evaluateMediaSourceShadow(
      asset,
      { _silent: true, _variantFetcher: async () => [] },
      { headerToken: "wrong", host: goodCtx.host },
    );
    expect(d.authorized).toBe(false);
    expect(d.reason).toBe("bad_header");
  });

  test("no_variants_for_context when fetcher returns []", async () => {
    const d = await evaluateMediaSourceShadow(
      asset,
      { _silent: true, _variantFetcher: async () => [] },
      goodCtx,
    );
    expect(d.authorized).toBe(true);
    expect(d.decision).toBe("would_use_legacy");
    expect(d.fallbackReason).toBe("no_variants_for_context");
    expect(typeof d.latencyMs).toBe("number");
  });

  test("variant_key_missing when chosen variant has null key", async () => {
    const d = await evaluateMediaSourceShadow(
      asset,
      {
        _silent: true,
        _variantFetcher: async () => [
          { format: "avif", width: 800, height: 1200, bucket: "b", path: "p", variant_key: null, usage_context: null } as never,
        ],
      },
      goodCtx,
    );
    expect(d.fallbackReason).toBe("variant_key_missing");
  });

  test("storage_unreachable on signer timeout", async () => {
    const d = await evaluateMediaSourceShadow(
      asset,
      {
        _silent: true,
        _variantFetcher: async () => [
          { format: "avif", width: 800, height: 1200, bucket: "b", path: "p", variant_key: "vk", usage_context: null } as never,
        ],
        _signer: async () => ({ ok: false, latencyMs: 2000, reason: "storage_unreachable" }),
      },
      goodCtx,
    );
    expect(d.decision).toBe("would_use_legacy");
    expect(d.fallbackReason).toBe("storage_unreachable");
    expect(d.signedUrlOk).toBe(false);
  });

  test("signed_url_error on signer error", async () => {
    const d = await evaluateMediaSourceShadow(
      asset,
      {
        _silent: true,
        _variantFetcher: async () => [
          { format: "webp", width: 800, height: 1200, bucket: "b", path: "p", variant_key: "vk", usage_context: null } as never,
        ],
        _signer: async () => ({ ok: false, latencyMs: 12, reason: "signed_url_error" }),
      },
      goodCtx,
    );
    expect(d.fallbackReason).toBe("signed_url_error");
  });

  test("would_use_pipeline when sign OK and variant_key present", async () => {
    const d = await evaluateMediaSourceShadow(
      asset,
      {
        _silent: true,
        _variantFetcher: async () => [
          { format: "avif", width: 800, height: 1200, bucket: "b", path: "p", variant_key: "vk-avif-800", usage_context: null } as never,
          { format: "jpeg", width: 800, height: 1200, bucket: "b", path: "p2", variant_key: "vk-jpeg-800", usage_context: null } as never,
        ],
        _signer: async () => ({ ok: true, latencyMs: 42 }),
      },
      goodCtx,
    );
    expect(d.decision).toBe("would_use_pipeline");
    expect(d.formatPreferred).toBe("avif");
    expect(d.variantKey).toBe("vk-avif-800");
    expect(d.signedUrlOk).toBe(true);
    expect(d.signedUrlLatencyMs).toBe(42);
  });
});

describe("D. Sanitización del evento", () => {
  test("emitShadowDecisionEvent never includes URLs, tokens, IP o cookies", () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (s: unknown) => { logs.push(String(s)); };
    try {
      __TEST_ONLY__.emitShadowDecisionEvent(
        {
          authorized: true,
          decision: "would_use_pipeline",
          variantKey: "vk-x",
          formatPreferred: "avif",
          widthChosen: 800,
          latencyMs: 12,
          signedUrlLatencyMs: 5,
          signedUrlOk: true,
        },
        ASSET,
      );
    } finally {
      console.log = orig;
    }
    expect(logs.length).toBe(1);
    const payload = logs[0];
    // Estas cadenas jamás deben aparecer en el evento.
    expect(payload.toLowerCase()).not.toContain("http://");
    expect(payload.toLowerCase()).not.toContain("https://");
    expect(payload.toLowerCase()).not.toContain("token=");
    expect(payload.toLowerCase()).not.toContain("cookie");
    expect(payload.toLowerCase()).not.toContain("authorization");
    expect(payload.toLowerCase()).not.toContain("referer");
    // Debe contener exactamente los campos permitidos.
    const parsed = JSON.parse(payload);
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "asset_id","decision","env","fallback_reason","format_preferred",
        "kind","latency_ms","signed_url_latency_ms","signed_url_ok","ts",
        "variant_key","width_chosen",
        "preload_latency_ms","preload_query_count","preload_error",
        "sign_source","sign_cache_lookup_ms","sign_network_ms",
        "phase_auth_ms","phase_preflight_ms","phase_select_ms",
        "phase_sign_ms","phase_parity_ms","phase_total_ms",
      ].sort(),
    );
  });
});

describe("E. Contrato aditivo · resolveMediaSource() byte-identidad", () => {
  const asset: MediaAssetInput = {
    id: ASSET,
    file_url: "https://cdn.example.com/original.jpg",
    original_width: 1600,
    original_height: 2400,
    pipeline_status: "ready",
    variants: [
      { format: "avif", width: 800, url: "https://cdn/avif/800.avif", status: "ready" },
      { format: "jpeg", width: 800, url: "https://cdn/jpeg/800.jpg", status: "ready" },
    ],
  };

  test("shape existente no cambia (usedPipeline true)", () => {
    const r = resolveMediaSource(asset);
    expect(r.canonical).toBe("https://cdn.example.com/original.jpg");
    expect(r.usedPipeline).toBe(true);
    expect(r.sources.length).toBe(1);
    // Campos M2 opcionales no se emiten si no se pasan opciones.
    expect(r.fallbackReason).toBeUndefined();
    expect(r.sizes).toBeUndefined();
    expect(r.priority).toBeUndefined();
  });

  test("con pipeline_status distinto de ready, byte-idéntico al legacy", () => {
    const r = resolveMediaSource({ ...asset, pipeline_status: "disabled" });
    expect(r.usedPipeline).toBe(false);
    expect(r.src).toBe("https://cdn.example.com/original.jpg");
    expect(r.sources).toEqual([]);
  });
});

describe("F. Respuesta del evaluador NO expone URLs firmadas", () => {
  test("shape del ShadowDecision no contiene ninguna URL", async () => {
    const d = await evaluateMediaSourceShadow(
      { id: ASSET, original_width: 1600 },
      {
        _silent: true,
        _variantFetcher: async () => [
          { format: "avif", width: 800, height: 1200, bucket: "b", path: "p", variant_key: "vk", usage_context: null } as never,
        ],
        _signer: async () => ({ ok: true, latencyMs: 5 }),
      },
      goodCtx,
    );
    const serialized = JSON.stringify(d);
    // Ninguna URL, path de storage, bucket, ni token pueden estar en el shape.
    expect(serialized).not.toContain("http:");
    expect(serialized).not.toContain("https:");
    expect(serialized).not.toContain("supabase.co");
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain("\"signedUrl\"");
    expect(serialized).not.toContain("\"bucket\"");
    expect(serialized).not.toContain("\"path\"");
  });
});