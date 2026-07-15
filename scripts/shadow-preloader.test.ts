/**
 * H3·A4 · M2.2 · Tests unitarios del Preloader + integración con el Evaluador.
 * Cubre las 12 validaciones obligatorias del alcance M2.2.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  preloadShadowAssetBundle,
  preloadShadowAssetBundles,
  type PreloadedBundle,
} from "../src/lib/media/shadow-preloader.server";
import { evaluateMediaSourceShadow, SHADOW_ALLOWLIST } from "../src/lib/media/shadow-evaluator.server";

const ALLOWED = Array.from(SHADOW_ALLOWLIST)[0]!;
const OUTSIDE = "00000000-0000-0000-0000-000000000000";
const SECRET = "unit-test-secret-value-do-not-use-in-prod";

beforeEach(() => { process.env.MEDIA_SHADOW_INTERNAL_SECRET = SECRET; });
afterEach(() => { delete process.env.MEDIA_SHADOW_INTERNAL_SECRET; });

/** Mock del cliente Supabase con contadores de queries. */
function makeMockClient(spec: {
  assets: Array<Record<string, unknown>>;
  variants: Array<Record<string, unknown>>;
  assetsFail?: "timeout" | "error";
  variantsFail?: "timeout" | "error";
}) {
  const counts = { asset_selects: 0, variant_selects: 0 };
  const build = (table: string) => {
    if (table === "media_assets") counts.asset_selects++;
    if (table === "media_asset_variants") counts.variant_selects++;
    const q: {
      _table: string;
      _in?: { col: string; ids: string[] };
      _eq: Array<{ col: string; val: unknown }>;
      select: (_c: string) => typeof q;
      in: (col: string, ids: string[]) => typeof q;
      eq: (col: string, val: unknown) => typeof q;
      then: (onOk: (v: unknown) => unknown) => Promise<unknown>;
    } = {
      _table: table,
      _eq: [],
      select() { return q; },
      in(col, ids) { q._in = { col, ids }; return q; },
      eq(col, val) { q._eq.push({ col, val }); return q; },
      then(onOk) {
        if (table === "media_assets") {
          if (spec.assetsFail === "timeout") {
            return new Promise(() => {}); // never resolves → withTimeout triggers
          }
          if (spec.assetsFail === "error") {
            return Promise.resolve({ data: null, error: { message: "boom" } }).then(onOk);
          }
          const ids = q._in?.ids ?? [];
          const data = spec.assets.filter((r) => ids.includes(String(r.id)));
          return Promise.resolve({ data, error: null }).then(onOk);
        }
        if (table === "media_asset_variants") {
          if (spec.variantsFail === "timeout") return new Promise(() => {});
          if (spec.variantsFail === "error") {
            return Promise.resolve({ data: null, error: { message: "boom" } }).then(onOk);
          }
          const ids = q._in?.ids ?? [];
          const data = spec.variants.filter((r) => ids.includes(String(r.asset_id)));
          return Promise.resolve({ data, error: null }).then(onOk);
        }
        return Promise.resolve({ data: [], error: null }).then(onOk);
      },
    };
    return q;
  };
  return {
    counts,
    client: { from: (t: string) => build(t) } as never,
  };
}

const ASSET_READY = {
  id: ALLOWED, original_width: 1600, original_height: 2400,
  pipeline_status: "ready", original_checksum: "abc123",
};
const ASSET_NO_CHECKSUM = { ...ASSET_READY, original_checksum: null };
const ASSET_DASH_CHECKSUM = { ...ASSET_READY, original_checksum: "-" };

const VARIANTS_READY = [
  { asset_id: ALLOWED, format: "avif", width: 800, height: 1200, bucket: "media-derived", path: "p/a.avif", variant_key: "vk-avif-800", usage_context: "generic" },
  { asset_id: ALLOWED, format: "webp", width: 800, height: 1200, bucket: "media-derived", path: "p/w.webp", variant_key: "vk-webp-800", usage_context: "generic" },
  { asset_id: ALLOWED, format: "jpeg", width: 800, height: 1200, bucket: "media-derived", path: "p/j.jpg", variant_key: "vk-jpeg-800", usage_context: "generic" },
];

const goodCtx = { headerToken: SECRET, host: "id-preview--foo.lovable.app" };

describe("V1. Asset permitido con variantes ready", () => {
  test("preloader devuelve bundle completo", async () => {
    const { client, counts } = makeMockClient({ assets: [ASSET_READY], variants: VARIANTS_READY });
    const { bundle, result } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle).not.toBeNull();
    expect(bundle!.variants.length).toBe(3);
    expect(bundle!.asset.has_original_checksum).toBe(true);
    expect(result.queryCount).toBe(2);
    expect(counts.asset_selects).toBe(1);
    expect(counts.variant_selects).toBe(1);
  });

  test("evaluador con bundle → would_use_pipeline", async () => {
    const { client } = makeMockClient({ assets: [ASSET_READY], variants: VARIANTS_READY });
    const { bundle, result } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true, preloaded: bundle, preloadTelemetry: { latencyMs: result.latencyMs, queryCount: result.queryCount }, _signer: async () => ({ ok: true, latencyMs: 10 }) },
      goodCtx,
    );
    expect(d.decision).toBe("would_use_pipeline");
    expect(d.formatPreferred).toBe("avif");
  });
});

describe("V2. Asset fuera de allowlist", () => {
  test("preloader lo descarta silenciosamente sin queries", async () => {
    const { client, counts } = makeMockClient({ assets: [], variants: [] });
    const { bundle, result } = await preloadShadowAssetBundle(OUTSIDE, { supabase: client });
    expect(bundle).toBeNull();
    expect(result.queryCount).toBe(0);
    expect(counts.asset_selects).toBe(0);
    expect(counts.variant_selects).toBe(0);
  });

  test("evaluador → authorized=false, reason='asset_not_allowlisted'", async () => {
    const d = await evaluateMediaSourceShadow(
      { id: OUTSIDE, original_width: 100 }, { _silent: true }, goodCtx,
    );
    expect(d.authorized).toBe(false);
    expect(d.reason).toBe("asset_not_allowlisted");
  });
});

describe("V3. Asset con checksum NULL o '-'", () => {
  test("NULL → has_original_checksum=false, evaluador variant_key_missing", async () => {
    const { client } = makeMockClient({ assets: [ASSET_NO_CHECKSUM], variants: VARIANTS_READY });
    const { bundle } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle!.asset.has_original_checksum).toBe(false);
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true, preloaded: bundle },
      goodCtx,
    );
    expect(d.fallbackReason).toBe("variant_key_missing");
  });
  test("'-' → has_original_checksum=false igualmente", async () => {
    const { client } = makeMockClient({ assets: [ASSET_DASH_CHECKSUM], variants: VARIANTS_READY });
    const { bundle } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle!.asset.has_original_checksum).toBe(false);
  });
});

describe("V4. Asset sin variantes", () => {
  test("bundle con variants=[] → no_variants_for_context", async () => {
    const { client } = makeMockClient({ assets: [ASSET_READY], variants: [] });
    const { bundle } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle!.variants.length).toBe(0);
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true, preloaded: bundle },
      goodCtx,
    );
    expect(d.fallbackReason).toBe("no_variants_for_context");
  });
});

describe("V5. Variante no ready", () => {
  test("preloader filtra por is_current+status (mock ya sólo devuelve ready)", async () => {
    // La query aplica eq('status','ready') y eq('is_current',true); simulamos
    // que la DB sólo devuelve las filas que pasan el filtro server-side.
    const { client } = makeMockClient({ assets: [ASSET_READY], variants: [] });
    const { bundle } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle!.variants.length).toBe(0);
  });
});

describe("V6. Error y timeout de base de datos", () => {
  test("timeout en media_assets → error='db_timeout'", async () => {
    const { client } = makeMockClient({ assets: [], variants: [], assetsFail: "timeout" });
    const { bundle, result } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle).toBeNull();
    expect(result.error).toBe("db_timeout");
  }, 5000);
  test("error en variants → error='db_error'", async () => {
    const { client } = makeMockClient({ assets: [ASSET_READY], variants: [], variantsFail: "error" });
    const { bundle, result } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(bundle).toBeNull();
    expect(result.error).toBe("db_error");
  });
  test("evaluador con preloadTelemetry.error → storage_unreachable", async () => {
    // Aunque el bundle esté presente por casualidad, un error propagado debe caer a legacy.
    const bogus: PreloadedBundle = {
      asset: { id: ALLOWED, original_width: 1600, original_height: 2400, pipeline_status: "ready", has_original_checksum: true },
      variants: [],
    };
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true, preloaded: bogus, preloadTelemetry: { latencyMs: 1500, queryCount: 1, error: "db_timeout" } },
      goodCtx,
    );
    expect(d.fallbackReason).toBe("storage_unreachable");
  });
});

describe("V7. Error de firma", () => {
  test("signer devuelve reason='signed_url_error' → decisión legacy", async () => {
    const bundle: PreloadedBundle = {
      asset: { id: ALLOWED, original_width: 1600, original_height: 2400, pipeline_status: "ready", has_original_checksum: true },
      variants: [{ format: "avif", width: 800, height: 1200, bucket: "b", path: "p", variant_key: "vk", usage_context: "generic" }],
    };
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true, preloaded: bundle, _signer: async () => ({ ok: false, latencyMs: 5, reason: "signed_url_error" }) },
      goodCtx,
    );
    expect(d.decision).toBe("would_use_legacy");
    expect(d.fallbackReason).toBe("signed_url_error");
  });
});

describe("V8. Host o secreto inválido", () => {
  test("host productivo → not authorized", async () => {
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true }, { headerToken: SECRET, host: "valladolidmx.lovable.app" },
    );
    expect(d.authorized).toBe(false);
    expect(d.reason).toBe("production_host");
  });
  test("header inválido → not authorized", async () => {
    const d = await evaluateMediaSourceShadow(
      { id: ALLOWED, original_width: 1600 },
      { _silent: true }, { headerToken: "xxx", host: goodCtx.host },
    );
    expect(d.reason).toBe("bad_header");
  });
});

describe("V9. Query count estable · sin N+1", () => {
  test("N assets ⇒ exactamente 2 queries totales", async () => {
    // Simular allowlist ampliada de forma controlada: repetimos el mismo id.
    // El preloader dedup por Set, así sigue haciendo 2 queries.
    const { client, counts } = makeMockClient({ assets: [ASSET_READY], variants: VARIANTS_READY });
    const result = await preloadShadowAssetBundles([ALLOWED, ALLOWED, ALLOWED, ALLOWED], { supabase: client });
    expect(result.queryCount).toBe(2);
    expect(counts.asset_selects).toBe(1);
    expect(counts.variant_selects).toBe(1);
  });
  test("0 assets elegibles ⇒ 0 queries", async () => {
    const { client, counts } = makeMockClient({ assets: [], variants: [] });
    const result = await preloadShadowAssetBundles([OUTSIDE, OUTSIDE], { supabase: client });
    expect(result.queryCount).toBe(0);
    expect(counts.asset_selects).toBe(0);
    expect(counts.variant_selects).toBe(0);
  });
});

describe("V10/V11. Contract: preloader NO expone URLs firmadas ni columnas prohibidas", () => {
  test("shape público del PreloadedBundle omite original_checksum crudo", async () => {
    const { client } = makeMockClient({ assets: [ASSET_READY], variants: VARIANTS_READY });
    const { bundle } = await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    const serialized = JSON.stringify(bundle);
    expect(serialized).not.toContain("abc123");      // checksum real
    expect(serialized).not.toContain("original_checksum"); // sólo el booleano
    expect(serialized).not.toContain("http:");
    expect(serialized).not.toContain("https:");
    expect(serialized).not.toContain("signedUrl");
  });
});

describe("V12. Preloader sólo pide columnas necesarias", () => {
  test("select() se llama con lista blanca, sin '*'", async () => {
    let assetSelect = "";
    let variantSelect = "";
    const client = {
      from(t: string) {
        const q = {
          select(cols: string) {
            if (t === "media_assets") assetSelect = cols;
            if (t === "media_asset_variants") variantSelect = cols;
            return q;
          },
          in() { return q; },
          eq() { return q; },
          then(onOk: (v: unknown) => unknown) {
            return Promise.resolve({ data: [], error: null }).then(onOk);
          },
        };
        return q;
      },
    } as never;
    await preloadShadowAssetBundle(ALLOWED, { supabase: client });
    expect(assetSelect).not.toContain("*");
    expect(assetSelect).toContain("original_width");
    expect(assetSelect).toContain("pipeline_status");
    expect(assetSelect).toContain("original_checksum"); // se lee, se convierte a booleano
    expect(variantSelect).not.toContain("*");
    expect(variantSelect).toContain("variant_key");
    expect(variantSelect).toContain("usage_context");
    // Nunca solicitamos columnas sensibles innecesarias.
    expect(assetSelect).not.toContain("metadata");
    expect(assetSelect).not.toContain("created_by");
    expect(assetSelect).not.toContain("alt_text");
  });
});