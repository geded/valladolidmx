/**
 * H3·A4 · M2.3 · Signed URL Cache — 8 escenarios + guardrails.
 */
import { describe, it, expect, beforeEach } from "bun:test";
import {
  probeSignedUrl,
  probeSignedUrlBatch,
  invalidateByVariantKey,
  clearSignCache,
  resetCacheStats,
  getCacheStats,
  MIN_REMAINING_SECONDS,
  __INSPECT__,
} from "../src/lib/media/sign.server";

const OK = { bucket: "media-derived", path: "avif/800/foo.avif" };

function makeSigner(latencyMs = 5, url = "https://signed.example/opaque?token=redacted") {
  let calls = 0;
  const signer = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, latencyMs));
    return { ok: true as const, url };
  };
  return {
    fn: signer,
    get calls() {
      return calls;
    },
  };
}

beforeEach(() => {
  clearSignCache();
  resetCacheStats();
});

describe("S1. Cache miss + set", () => {
  it("primera llamada golpea red y guarda entry", async () => {
    const s = makeSigner();
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-1" }, { _signer: s.fn });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("cache_miss");
    expect(s.calls).toBe(1);
    expect(__INSPECT__.cacheHas({ ...OK, variantKey: "vk-1" })).toBe(true);
    expect(getCacheStats().misses).toBe(1);
  });
});

describe("S2. Cache hit", () => {
  it("segunda llamada es hit y no golpea red", async () => {
    const s = makeSigner();
    await probeSignedUrl({ ...OK, variantKey: "vk-2" }, { _signer: s.fn });
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-2" }, { _signer: s.fn });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("cache_hit");
    expect(s.calls).toBe(1);
    expect(getCacheStats().hits).toBe(1);
  });

  it("cache hit latencia << 5 ms (sintético)", async () => {
    const s = makeSigner();
    await probeSignedUrl({ ...OK, variantKey: "vk-lat" }, { _signer: s.fn });
    const arr: number[] = [];
    for (let i = 0; i < 200; i++) {
      const r = await probeSignedUrl({ ...OK, variantKey: "vk-lat" }, { _signer: s.fn });
      if (r.ok) arr.push(r.latencyMs);
    }
    arr.sort((a, b) => a - b);
    const p95 = arr[Math.floor(arr.length * 0.95)];
    expect(p95).toBeLessThan(5);
  });
});

describe("S3. Single-flight coalescing", () => {
  it("N solicitudes concurrentes al mismo key ⇒ 1 sola llamada de red", async () => {
    const s = makeSigner(30);
    const N = 50;
    const results = await Promise.all(
      Array.from({ length: N }, () => probeSignedUrl({ ...OK, variantKey: "vk-race" }, { _signer: s.fn })),
    );
    expect(s.calls).toBe(1);
    const misses = results.filter((r) => r.source === "cache_miss").length;
    const coalesced = results.filter((r) => r.source === "coalesced").length;
    expect(misses).toBe(1);
    expect(coalesced).toBe(N - 1);
  });
});

describe("S4. Margen de vigencia (min 300 s)", () => {
  it("no devuelve entrada con menos de 300 s de vigencia", async () => {
    const now = { t: 1_000_000 };
    const clock = () => now.t;
    const s = makeSigner(0);
    await probeSignedUrl({ ...OK, variantKey: "vk-exp" }, { _signer: s.fn, _now: clock });
    // Avanzar tiempo hasta que queden 299 s de vigencia.
    const TTL = 7 * 24 * 60 * 60 * 1000;
    now.t += TTL - 299 * 1000;
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-exp" }, { _signer: s.fn, _now: clock });
    expect(r.source).toBe("cache_miss");
    expect(s.calls).toBe(2);
    expect(getCacheStats().expiredEvictions).toBe(1);
  });
});

describe("S5. Invalidación por variant_key", () => {
  it("elimina la entrada; la siguiente llamada regenera", async () => {
    const s = makeSigner(0);
    await probeSignedUrl({ ...OK, variantKey: "vk-inv" }, { _signer: s.fn });
    expect(invalidateByVariantKey("vk-inv")).toBe(true);
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-inv" }, { _signer: s.fn });
    expect(r.source).toBe("cache_miss");
    expect(s.calls).toBe(2);
  });
});

describe("S6. Storage error/timeout", () => {
  it("timeout del signer ⇒ ok=false reason storage_unreachable, sin propagación", async () => {
    const signer = async () => ({ ok: false as const, reason: "storage_unreachable" as const });
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-to" }, { _signer: signer });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("storage_unreachable");
    // Sin entrada persistida.
    expect(__INSPECT__.cacheHas({ ...OK, variantKey: "vk-to" })).toBe(false);
    expect(getCacheStats().errors).toBe(1);
  });

  it("signer que arroja ⇒ ok=false signed_url_error", async () => {
    const signer = async () => {
      throw new Error("boom");
    };
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-throw" }, { _signer: signer });
    expect(r.ok).toBe(false);
  });
});

describe("S7. Batch + LRU", () => {
  it("batch resuelve todos e independiza single-flight por key", async () => {
    const s = makeSigner(1);
    const items = Array.from({ length: 5 }, (_, i) => ({ bucket: "b", path: `p${i}`, variantKey: `vk-b${i}` }));
    const r = await probeSignedUrlBatch(items, { _signer: s.fn });
    expect(r.every((x) => x.ok)).toBe(true);
    expect(s.calls).toBe(5);
  });

  it("LRU respeta límite (bump on hit)", async () => {
    // No comprobamos evict de 500 en un unit test — sólo que las keys se
    // rastrean y bump on hit.
    const s = makeSigner(0);
    await probeSignedUrl({ ...OK, variantKey: "vk-lru-a" }, { _signer: s.fn });
    await probeSignedUrl({ ...OK, variantKey: "vk-lru-b" }, { _signer: s.fn });
    await probeSignedUrl({ ...OK, variantKey: "vk-lru-a" }, { _signer: s.fn }); // hit → bump
    const keys = __INSPECT__.cacheKeys();
    // 'a' fue accedida al final ⇒ está al final de la lista.
    expect(keys[keys.length - 1]).toBe("vk:vk-lru-a");
  });
});

describe("S8. Fallback: cache jamás compromete el render", () => {
  it("un fallo del signer NUNCA lanza excepción no capturada", async () => {
    const signer = async () => {
      throw new Error("catastrophic");
    };
    // Debe resolver, no rechazar.
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-nofail" }, { _signer: signer });
    expect(r.ok).toBe(false);
  });

  it("Nunca serializa la URL fuera del contrato SignResult", async () => {
    const s = makeSigner(0, "https://very-secret.example/token?leak=yes");
    const r = await probeSignedUrl({ ...OK, variantKey: "vk-leak" }, { _signer: s.fn });
    const dump = JSON.stringify(r);
    expect(dump).not.toContain("very-secret");
    expect(dump).not.toContain("leak=yes");
    expect(dump).not.toContain("token=");
  });
});

describe("Guardrails", () => {
  it("MIN_REMAINING_SECONDS es 300", () => {
    expect(MIN_REMAINING_SECONDS).toBe(300);
  });
});