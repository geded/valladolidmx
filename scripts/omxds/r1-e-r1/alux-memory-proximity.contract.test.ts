/**
 * G8-R1-E-R1 · Gate `validate:r1:e:r1`.
 *
 * Acredita, sobre capas puras y deterministas (sin red, sin DB):
 *  · memoria funcional local (TTL, opt-out, borrado, id seudónimo);
 *  · contrato de eventos seudónimos (allowlist, cero PII);
 *  · deduplicación / rate limit del emisor único;
 *  · proximidad acreditada (consentimiento, coordenadas, fail-safe).
 */
import { describe, expect, test } from "vitest";
import {
  ALUX_MEMORY_TTL_MS,
  ALUX_MEMORY_VERSION,
  normalizeMemory,
  randomSubjectId,
} from "../../../src/lib/alux/memory-store";
import { summarizeSignals } from "../../../src/lib/alux/behavior-signals";
import { toVisitorEvent, SIGNAL_ACTION } from "../../../src/lib/alux/signal-events";
import { shouldEmit, ALUX_SIGNAL_DEDUPE_MS } from "../../../src/lib/alux/signal-emitter";
import {
  attachDistance,
  haversineKm,
  isValidPoint,
  sortByProximity,
  formatDistance,
} from "../../../src/lib/alux/proximity";
import { VisitorEventSchema } from "../../../src/lib/visitor-intel/events";

const NOW = 1_800_000_000_000;
const memory = (over: Record<string, unknown> = {}) => ({
  version: ALUX_MEMORY_VERSION,
  subjectId: randomSubjectId(),
  personalization: "active",
  signals: [],
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe("Memoria funcional local", () => {
  test("1 · id seudónimo aleatorio, nunca derivado del dispositivo", () => {
    expect(randomSubjectId()).not.toBe(randomSubjectId());
  });

  test("2 · registro vigente se normaliza", () => {
    expect(normalizeMemory(memory(), NOW)?.personalization).toBe("active");
  });

  test("3 · TTL real: registro vencido no es rescatable", () => {
    expect(normalizeMemory(memory({ updatedAt: NOW - ALUX_MEMORY_TTL_MS - 1 }), NOW)).toBeNull();
  });

  test("4 · versión desconocida se descarta (fail-closed)", () => {
    expect(normalizeMemory(memory({ version: "0.9.0" }), NOW)).toBeNull();
  });

  test("5 · señales inválidas se descartan al normalizar", () => {
    const rec = normalizeMemory(
      memory({ signals: [{ kind: "keystrokes", key: "x", at: NOW, purpose: "personalization" }] }),
      NOW,
    );
    expect(rec?.signals).toHaveLength(0);
  });

  test("6 · pausa ⇒ resumen vacío y sin uso del historial anterior", () => {
    const summary = summarizeSignals({
      signals: [{ kind: "category_explored", key: "hoteles", at: NOW, purpose: "personalization" }],
      optedOut: true,
      now: NOW,
    });
    expect(summary.enabled).toBe(false);
    expect(summary.signalCount).toBe(0);
  });

  test("7 · señales vigentes producen afinidad acotada y explicable", () => {
    const summary = summarizeSignals({
      signals: [
        { kind: "category_explored", key: "hoteles", at: NOW, purpose: "personalization" },
        { kind: "saved", key: "hotel-abc", at: NOW, purpose: "personalization" },
      ],
      now: NOW,
    });
    expect(summary.enabled).toBe(true);
    expect(summary.categoryAffinity.hoteles).toBeGreaterThan(0);
    expect(summary.reason).toMatch(/señal/i);
  });
});

describe("Contrato de eventos seudónimos", () => {
  const ctx = {
    subjectId: randomSubjectId(),
    isAuthenticated: false,
    locale: "es",
    surface: "alux_dock",
    route: "/oriente-maya/valladolid",
    destinationId: null,
    travelStage: "exploration" as const,
    targetType: "destination",
    recommendationSource: "alux",
    algorithmVersion: "1.0.0",
  };

  test("8 · señal de navegación produce evento canónico válido", () => {
    const event = toVisitorEvent(
      { kind: "territory_viewed", key: "valladolid", at: NOW, purpose: "personalization" },
      ctx,
    );
    expect(VisitorEventSchema.safeParse(event).success).toBe(true);
  });

  test("9 · anónimo se publica siempre como N0", () => {
    const event = toVisitorEvent(
      { kind: "entity_viewed", key: "hotel-abc", at: NOW, purpose: "personalization" },
      ctx,
    );
    expect(event?.subject.trust_level).toBe("N0_anonymous");
  });

  test("10 · aceptación/rechazo viajan como decision.offered", () => {
    const accepted = toVisitorEvent(
      { kind: "suggestion_accepted", key: "rec-1", at: NOW, purpose: "personalization" },
      ctx,
    );
    const rejected = toVisitorEvent(
      { kind: "suggestion_rejected", key: "rec-1", at: NOW, purpose: "personalization" },
      ctx,
    );
    expect(accepted?.kind).toBe("decision.offered");
    expect(rejected?.kind).toBe("decision.offered");
    expect(VisitorEventSchema.safeParse(rejected).success).toBe(true);
  });

  test("11 · personalización pausada ⇒ no se construye evento", () => {
    expect(
      toVisitorEvent(
        { kind: "saved", key: "hotel-abc", at: NOW, purpose: "personalization" },
        { ...ctx, personalizationState: "paused" },
      ),
    ).toBeNull();
  });

  test("12 · contexto insuficiente ⇒ fail-closed", () => {
    expect(
      toVisitorEvent(
        { kind: "saved", key: "hotel-abc", at: NOW, purpose: "personalization" },
        { ...ctx, subjectId: "" },
      ),
    ).toBeNull();
  });

  test("13 · cero PII en el evento serializado", () => {
    const event = toVisitorEvent(
      { kind: "plan_added", key: "tour-cenotes", at: NOW, purpose: "personalization" },
      ctx,
    );
    const json = JSON.stringify(event);
    for (const forbidden of ["email", "phone", "name", "token", "role", "password", "lat", "lng"]) {
      expect(json.toLowerCase()).not.toContain(`"${forbidden}"`);
    }
  });

  test("14 · allowlist cerrada de acciones", () => {
    expect(Object.keys(SIGNAL_ACTION)).toHaveLength(8);
  });
});

describe("Emisor único: dedupe y rate limit", () => {
  test("15 · señal repetida dentro de la ventana se descarta (idempotencia)", () => {
    expect(
      shouldEmit({ kind: "saved", key: "a", now: NOW }, { paused: false, lastAt: NOW - 1_000 }),
    ).toEqual({ ok: false, reason: "duplicate" });
  });

  test("16 · fuera de la ventana vuelve a emitirse", () => {
    expect(
      shouldEmit(
        { kind: "saved", key: "a", now: NOW },
        { paused: false, lastAt: NOW - ALUX_SIGNAL_DEDUPE_MS - 1 },
      ).ok,
    ).toBe(true);
  });

  test("17 · opt-out bloquea la emisión", () => {
    expect(shouldEmit({ kind: "saved", key: "a", now: NOW }, { paused: true })).toEqual({
      ok: false,
      reason: "paused",
    });
  });
});

describe("Proximidad acreditada", () => {
  const origin = { lat: 20.6892, lng: -88.2011 }; // Valladolid centro
  const withCoords = {
    slug: "cenote-zaci",
    coords: { lat: 20.6905, lng: -88.1997, source: "poi" as const },
  };
  const withoutCoords = { slug: "tour-sin-ubicacion", coords: null };
  const getCoords = (c: { coords: { lat: number; lng: number; source: "poi" } | null }) => c.coords;

  test("18 · distancia conocida es correcta y determinista", () => {
    expect(haversineKm(origin, { lat: 20.6892, lng: -88.2011 })).toBe(0);
    expect(haversineKm(origin, withCoords.coords)).toBeLessThan(1);
  });

  test("19 · sin consentimiento no hay ninguna distancia", () => {
    const out = attachDistance({
      candidates: [withCoords],
      origin,
      consentGranted: false,
      getCoords,
    });
    expect(out[0].distanceKm).toBeUndefined();
  });

  test("20 · con consentimiento y coordenadas acreditadas hay distancia y origen", () => {
    const out = attachDistance({
      candidates: [withCoords],
      origin,
      consentGranted: true,
      getCoords,
    });
    expect(typeof out[0].distanceKm).toBe("number");
    expect(out[0].distanceSource).toBe("poi");
  });

  test("21 · candidato sin coordenadas nunca recibe distancia inventada", () => {
    const out = attachDistance({
      candidates: [withoutCoords],
      origin,
      consentGranted: true,
      getCoords,
    });
    expect(out[0].distanceKm).toBeUndefined();
    expect(formatDistance(out[0].distanceKm)).toBeNull();
  });

  test("22 · orden 'Cerca de mí' excluye a los candidatos sin distancia", () => {
    const out = attachDistance({
      candidates: [withoutCoords, withCoords],
      origin,
      consentGranted: true,
      getCoords,
    });
    expect(sortByProximity(out)).toHaveLength(1);
  });

  test("23 · coordenada nula o fuera de rango no es acreditable", () => {
    expect(isValidPoint({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidPoint({ lat: 120, lng: 10 })).toBe(false);
    expect(isValidPoint(origin)).toBe(true);
  });
});
