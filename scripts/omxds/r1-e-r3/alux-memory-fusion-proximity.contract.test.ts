/**
 * G8-R1-E-R3 · Gate `validate:r1:e:r3`.
 *
 * Amplía R1-E-R1 con los eslabones cerrados en R1-E-R3:
 *  · rate limit DURABLE server-side (clave seudónima, fail-closed);
 *  · resumen permitido de memoria (allowlist estricta, cero PII, TTL);
 *  · fusión anónimo → cuenta con comprobante de posesión;
 *  · continuidad multidispositivo (mezcla de resumen remoto);
 *  · proximidad end-to-end (distancia sólo cuando es acreditada).
 */
import { describe, expect, test } from "vitest";
import {
  consumeDurableRate,
  rateScopeKey,
  INGEST_RATE_CAPABILITY,
} from "../../../src/lib/visitor-intel/rate-limit.server";
import { validateIngestEvent } from "../../../src/lib/visitor-intel/ingest.functions";
import {
  AluxMemorySummarySchema,
  EMPTY_MEMORY_SUMMARY,
  normalizeMemorySummary,
  toMemorySummary,
} from "../../../src/lib/alux/memory-summary";
import { EMPTY_SIGNAL_SUMMARY, summarizeSignals } from "../../../src/lib/alux/behavior-signals";
import { attachDistance } from "../../../src/lib/alux/proximity";

const NOW = 1_800_000_000_000;

describe("Rate limit durable de ingesta", () => {
  test("clave de bucket seudónima, sin PII", () => {
    expect(rateScopeKey("abc-123")).toBe("subject:abc-123");
    expect(rateScopeKey("abc-123")).not.toContain("@");
  });

  test("permite mientras el bucket lo autoriza", async () => {
    const admin = {
      rpc: async () => ({
        data: [{ allowed: true, current_count: 3, retry_after_seconds: 0 }],
        error: null,
      }),
    };
    const decision = await consumeDurableRate(admin, {
      subjectId: "s1",
      capability: INGEST_RATE_CAPABILITY,
    });
    expect(decision).toEqual({ allowed: true, count: 3, retryAfterSeconds: 0 });
  });

  test("deniega al exceder el límite", async () => {
    const admin = {
      rpc: async () => ({
        data: [{ allowed: false, current_count: 61, retry_after_seconds: 42 }],
        error: null,
      }),
    };
    const decision = await consumeDurableRate(admin, { subjectId: "s1", capability: "x" });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(42);
  });

  test("fail-closed ante error del contador", async () => {
    const admin = { rpc: async () => ({ data: null, error: { message: "boom" } }) };
    const decision = await consumeDurableRate(admin, { subjectId: "s1", capability: "x" });
    expect(decision.allowed).toBe(false);
  });

  test("fail-closed sin sujeto", async () => {
    const admin = { rpc: async () => ({ data: [{ allowed: true }], error: null }) };
    const decision = await consumeDurableRate(admin, { subjectId: "", capability: "x" });
    expect(decision.allowed).toBe(false);
  });

  test("no regresión: validación canónica de ingesta intacta", () => {
    expect(
      validateIngestEvent({
        event_id: "00000000-0000-4000-a000-000000000000",
        occurred_at: new Date(NOW).toISOString(),
        schema_version: "9.9.9",
        kind: "intent.signal",
        subject: { subject_id: "s", trust_level: "N0_anonymous", is_authenticated: false },
        context: { surface: "alux_dock", route: "/" },
        intent: { action: "entity_viewed", target_type: "business", target_id: "x", strength: 0.4 },
      } as never),
    ).toEqual({ accepted: false, reason: "invalid_schema" });
  });
});

describe("Resumen permitido de memoria", () => {
  const signals = summarizeSignals({
    signals: [
      { kind: "category_explored", key: "hoteles", at: NOW, purpose: "personalization" },
      { kind: "territory_viewed", key: "valladolid", at: NOW, purpose: "personalization" },
      { kind: "saved", key: "hotel-zaci", at: NOW, purpose: "personalization" },
    ],
    now: NOW,
  });

  test("construye resumen desde señales reales", () => {
    const summary = toMemorySummary({ signals, ttlMs: 86_400_000, now: NOW });
    expect(summary.territoryAffinity).toContain("valladolid");
    expect(summary.interests).toContain("hotel-zaci");
    expect(summary.updatedAt).toBe(NOW);
  });

  test("rechaza campos no permitidos (cero PII)", () => {
    const parsed = AluxMemorySummarySchema.safeParse({
      ...EMPTY_MEMORY_SUMMARY,
      updatedAt: NOW,
      email: "a@b.com",
    });
    expect(parsed.success).toBe(false);
  });

  test("rechaza ubicación precisa dentro del resumen", () => {
    const parsed = AluxMemorySummarySchema.safeParse({
      ...EMPTY_MEMORY_SUMMARY,
      updatedAt: NOW,
      lat: 20.68,
      lng: -88.2,
    });
    expect(parsed.success).toBe(false);
  });

  test("resumen caducado no se recupera", () => {
    const summary = toMemorySummary({ signals, ttlMs: 1_000, now: NOW });
    expect(normalizeMemorySummary(summary, NOW + 5_000)).toBeNull();
    expect(normalizeMemorySummary(summary, NOW + 500)).not.toBeNull();
  });

  test("resumen vigente es idempotente al re-normalizarse", () => {
    const summary = toMemorySummary({ signals, ttlMs: 86_400_000, now: NOW });
    expect(normalizeMemorySummary(normalizeMemorySummary(summary, NOW), NOW)).toEqual(summary);
  });

  test("señales pausadas producen resumen sin afinidades", () => {
    const summary = toMemorySummary({
      signals: EMPTY_SIGNAL_SUMMARY,
      ttlMs: 86_400_000,
      now: NOW,
    });
    expect(summary.categoryAffinity).toEqual([]);
    expect(summary.territoryAffinity).toEqual([]);
  });

  test("grupo de viaje viaja como dato agregado, sin identidades", () => {
    const summary = toMemorySummary({
      signals,
      ttlMs: 86_400_000,
      now: NOW,
      party: { adults: 2, minors: 1 },
    });
    expect(summary.party).toEqual({ adults: 2, minors: 1 });
  });
});

describe("Proximidad end-to-end", () => {
  const origin = { lat: 20.6896, lng: -88.2011 };
  const candidates = [
    { slug: "cerca", coords: { lat: 20.69, lng: -88.2, source: "business_location" as const } },
    { slug: "lejos", coords: { lat: 21.5, lng: -89.0, source: "product_operator" as const } },
    { slug: "sin-coords", coords: null },
  ];

  test("asigna distancia sólo con consentimiento", () => {
    const withConsent = attachDistance({
      candidates,
      origin,
      consentGranted: true,
      getCoords: (c) => c.coords,
    });
    expect(withConsent[0]?.distanceKm).toBeGreaterThanOrEqual(0);
    expect(withConsent[1]?.distanceKm).toBeGreaterThan(withConsent[0]!.distanceKm!);
    expect(withConsent[2]?.distanceKm).toBeUndefined();
  });

  test("sin consentimiento no hay distancia", () => {
    const none = attachDistance({
      candidates,
      origin,
      consentGranted: false,
      getCoords: (c) => c.coords,
    });
    expect(none.every((c) => c.distanceKm === undefined)).toBe(true);
  });

  test("hereda coordenadas del operador sin inventarlas", () => {
    const ranked = attachDistance({
      candidates,
      origin,
      consentGranted: true,
      getCoords: (c) => c.coords,
    });
    expect(ranked[1]?.distanceSource).toBe("product_operator");
    expect(ranked[2]?.distanceSource).toBeUndefined();
  });
});
