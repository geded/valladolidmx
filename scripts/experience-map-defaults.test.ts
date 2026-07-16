/**
 * C2.F1 · Piloto Render-Only Block Contracts.
 *
 * Valida equivalencia runtime entre `applyExperienceMapDefaults()`
 * (ruta pública, sin Zod) y `experienceMapDTOSchema.parse()`
 * (ruta de escritura Studio/CMS/server) para fixtures válidos.
 *
 * Ejecutar con: `bun test scripts/experience-map-defaults.test.ts`
 */
import { describe, expect, test } from "bun:test";
import {
  applyExperienceMapDefaults,
  experienceMapDTOSchema,
} from "../src/lib/experience-builder/blocks/experience-map/contract";

const validPoint = {
  id: "p-1",
  kind: "business" as const,
  lat: 20.6892,
  lng: -88.2011,
  title: "Casa de los Venados",
};

const fullDTO = {
  variant: "multi" as const,
  heading: "Cerca de ti",
  center: { lat: 20.69, lng: -88.2, zoom: 13 },
  points: [
    { ...validPoint },
    { ...validPoint, id: "p-2", title: "Cenote Zací", kind: "destination" as const, subtitle: "5 min", href: "/oriente-maya/valladolid/cenotes/zaci", thumbUrl: "https://cdn.example.com/z.jpg", priceLabel: "Desde $80", badge: null },
  ],
  capabilities: {
    showDistance: false,
    showDirections: true,
    clustering: true,
    syncList: false,
    staticFallback: true,
    allowInteractiveToggle: false,
  },
  emptyMessage: null,
};

function equivalent(input: unknown, label: string) {
  const zodOut = experienceMapDTOSchema.parse(input);
  const renderOut = applyExperienceMapDefaults(input);
  // Comparamos por JSON estable (ambos serializan igual). Los campos
  // opcionales `undefined` colapsan en ambos serializadores.
  expect(JSON.stringify(renderOut), `[${label}] render vs zod`).toBe(
    JSON.stringify(zodOut),
  );
}

describe("experience-map · applyRenderDefaults ↔ zod parse equivalence", () => {
  test("config completo", () => equivalent(fullDTO, "full"));

  test("config parcial (sólo variant + points)", () =>
    equivalent({ variant: "single", points: [validPoint] }, "partial"));

  test("propiedades ausentes (sólo points)", () =>
    equivalent({ points: [validPoint] }, "missing-props"));

  test("valores null explícitos", () =>
    equivalent(
      {
        variant: "single",
        points: [validPoint],
        heading: null,
        emptyMessage: null,
        center: null,
      },
      "explicit-null",
    ));

  test("defaults puros (input vacío)", () => {
    const renderOut = applyExperienceMapDefaults({});
    // Zod fallará por points ausente si no defaulteamos — el schema
    // ya define default([]) para points, default("single") para variant
    // y default() para capabilities, así que parse debe suceder.
    const zodOut = experienceMapDTOSchema.parse({});
    expect(JSON.stringify(renderOut)).toBe(JSON.stringify(zodOut));
  });

  test("todas las variantes válidas", () => {
    for (const v of ["single", "multi", "list-sync", "cluster"] as const) {
      equivalent({ variant: v, points: [validPoint] }, `variant:${v}`);
    }
  });

  test("todos los kinds válidos", () => {
    for (const k of [
      "business",
      "product",
      "destination",
      "event",
      "promotion",
    ] as const) {
      equivalent(
        { points: [{ ...validPoint, kind: k, id: `k-${k}` }] },
        `kind:${k}`,
      );
    }
  });
});

describe("experience-map · datos inválidos (no fixing silencioso)", () => {
  test("coordenadas fuera de rango: zod lanza, renderer descarta el punto", () => {
    const bad = { points: [{ ...validPoint, lat: 200 }] };
    expect(() => experienceMapDTOSchema.parse(bad)).toThrow();
    // Ruta pública: el punto inválido se descarta silenciosamente;
    // mismo efecto que el flujo previo (safeParse aguas arriba + filtro).
    const out = applyExperienceMapDefaults(bad);
    expect(out.points).toEqual([]);
  });

  test("campos desconocidos se ignoran en ambos flujos", () => {
    const withExtra = {
      variant: "single",
      points: [{ ...validPoint, extraneous: "x" }],
      unknownRoot: 42,
    } as unknown;
    equivalent(withExtra, "unknown-fields");
  });

  test("valor no reconocido en variant colapsa a default", () => {
    const out = applyExperienceMapDefaults({
      variant: "totally-invalid",
      points: [validPoint],
    });
    expect(out.variant).toBe("single");
  });
});