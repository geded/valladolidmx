/**
 * G8-R1-F1B-B3 · Contrato del gate `validate:r1:f1b:b3`.
 *
 * Verifica, sin IO de red y sin base de datos:
 *  · política Nominatim (allowlist, UA, rate limit, cero autocomplete/navegador)
 *  · caché e idempotencia
 *  · licencia y atribución ODbL
 *  · precisión declarada y coherencia territorial
 *  · procedencia registrada
 *  · permisos del preview y draft inaccesible públicamente
 *  · cero renderer paralelo · cero publicación
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BATCH_ADDRESSES,
  MIN_INTERVAL_MS,
  USER_AGENT,
  LICENSE,
  ATTRIBUTION,
  NOMINATIM_ENDPOINT,
  TERRITORIAL_CENTERS,
  evaluate,
  precisionOf,
  haversineKm,
  normalizeRoad,
  CACHE_PATH,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — módulo .mjs de operación puntual
} from "./geocode-batch.mjs";

const cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
const geocodeSrc = readFileSync("scripts/omxds/r1-f1b-b3/geocode-batch.mjs", "utf8");
const previewSrc = readFileSync(
  "src/routes/_authenticated/cms/empresas.$businessId.preview.tsx",
  "utf8",
);
const readerSrc = readFileSync("src/lib/cms/business-draft-preview.functions.ts", "utf8");

describe("B3 · política Nominatim", () => {
  it("consulta un único endpoint de geocodificación por dirección", () => {
    expect(NOMINATIM_ENDPOINT).toBe("https://nominatim.openstreetmap.org/search");
    const code = geocodeSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/autocomplete|typeahead/i);
    expect(code).not.toMatch(/googleapis|maps\.google|airbnb|booking\.com/i);
    expect(code.match(/await fetch\(/g) ?? []).toHaveLength(1);
  });

  it("declara User-Agent identificable con contacto técnico", () => {
    expect(USER_AGENT).toMatch(/ValladolidMX-EditorialGeocoder/);
    expect(USER_AGENT).toMatch(/@/);
  });

  it("respeta un rate limit conservador de al menos 1 req/s", () => {
    expect(MIN_INTERVAL_MS).toBeGreaterThanOrEqual(1000);
  });

  it("sólo consulta las direcciones acreditadas del lote (allowlist)", () => {
    expect(BATCH_ADDRESSES).toHaveLength(10);
    for (const e of BATCH_ADDRESSES) {
      expect(e.query).toMatch(/Yucatán, México$/);
      expect(TERRITORIAL_CENTERS[e.destination]).toBeTruthy();
    }
  });

  it("no se ejecuta desde el navegador", () => {
    expect(previewSrc).not.toMatch(/nominatim/i);
    expect(readerSrc).not.toMatch(/nominatim/i);
  });
});

describe("B3 · caché, idempotencia y licencia", () => {
  it("persiste el resultado con licencia y atribución OpenStreetMap", () => {
    expect(cache.license).toBe(LICENSE);
    expect(cache.attribution).toBe(ATTRIBUTION);
    expect(ATTRIBUTION).toMatch(/OpenStreetMap contributors/);
  });

  it("la segunda ejecución no vuelve a consultar (cache hit)", () => {
    expect(cache.queriesThisRun).toBe(0);
    expect(Object.keys(cache.entries)).toHaveLength(10);
  });

  it("registra URL, fecha, osm_type/osm_id y proveedor por consulta", () => {
    for (const rec of Object.values<Record<string, any>>(cache.entries)) {
      expect(rec.requestUrl).toMatch(/^https:\/\/nominatim\.openstreetmap\.org\/search\?q=/);
      expect(new Date(rec.queriedAt).toString()).not.toBe("Invalid Date");
      expect(rec.provider).toBe("nominatim.openstreetmap.org");
      expect(rec.raw?.osm_type).toBeTruthy();
      expect(rec.raw?.osm_id).toBeTruthy();
    }
  });
});

describe("B3 · precisión y coherencia territorial", () => {
  it("clasifica precisión sin inflarla", () => {
    expect(precisionOf(null)).toBe("no_resoluble");
    expect(precisionOf({ class: "boundary", type: "administrative" })).toBe("municipio");
    expect(precisionOf({ class: "highway", type: "residential", address: {} })).toBe("calle");
  });

  it("rechaza 0,0, otro estado y vialidad distinta", () => {
    const e = BATCH_ADDRESSES[0];
    expect(evaluate(e, { lat: "0", lon: "0" }).accepted).toBe(false);
    expect(
      evaluate(e, { lat: "21", lon: "-89", address: { state: "Quintana Roo" } }).accepted,
    ).toBe(false);
    expect(normalizeRoad("Calle 54-A")).toBe(normalizeRoad("calle 54a"));
  });

  it("no aproxima nunca al centro territorial", () => {
    for (const rec of Object.values<Record<string, any>>(cache.entries)) {
      if (!rec.verdict.accepted) continue;
      const center = TERRITORIAL_CENTERS[rec.destination];
      const d = haversineKm(center, { lat: rec.raw.lat, lon: rec.raw.lon });
      expect(d).toBeGreaterThan(0.01);
      expect(d).toBeLessThanOrEqual(center.maxKm);
    }
  });

  it("sólo edificio o calle coherente puede considerarse candidato", () => {
    for (const rec of Object.values<Record<string, any>>(cache.entries)) {
      if (rec.verdict.accepted) expect(["edificio", "calle"]).toContain(rec.verdict.precision);
    }
  });

  it("acredita 6 coordenadas y mantiene 4 pendientes de confirmación", () => {
    const accepted = Object.values<Record<string, any>>(cache.entries).filter(
      (r) => r.verdict.accepted,
    );
    expect(accepted).toHaveLength(6);
  });
});

describe("B3 · preview interno", () => {
  it("exige sesión y rol editorial en el servidor", () => {
    expect(readerSrc).toMatch(/requireSupabaseAuth/);
    expect(readerSrc).toMatch(/is_editor_or_admin/);
    expect(readerSrc).toMatch(/throw new Error\("forbidden"\)/);
  });

  it("vive bajo `_authenticated` y es noindex,nofollow", () => {
    expect(previewSrc).toMatch(/_authenticated\/cms\/empresas\/\$businessId\/preview/);
    expect(previewSrc).toMatch(/noindex, nofollow/);
  });

  it("reutiliza la superficie productiva — cero renderer paralelo", () => {
    expect(previewSrc).toMatch(/BusinessSurfaceContractBoundary/);
    expect(previewSrc).toMatch(/BusinessSurfaceProvider/);
    expect(previewSrc).toMatch(/ContextEngineProvider/);
    expect(previewSrc).toMatch(/bindBusinessRoute/);
    expect(previewSrc).not.toMatch(/mockBusiness|demoBusiness|FIXTURE_BUSINESS/);
  });

  it("es sólo lectura: no publica, no aprueba, no activa flags", () => {
    expect(readerSrc).not.toMatch(/\.update\(|\.insert\(|\.upsert\(|\.delete\(/);
    expect(readerSrc).not.toMatch(/status:\s*"published"/);
  });

  it("no oculta errores del proveedor de mapa con catch silencioso", () => {
    expect(previewSrc).not.toMatch(/RefererNotAllowedMapError/);
  });
});
