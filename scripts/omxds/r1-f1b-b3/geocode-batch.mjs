/**
 * G8-R1-F1B-B3 · Geocodificación única y deliberada del lote B1/B2.
 *
 * Política Nominatim (obligatoria, auditada por `validate:r1:f1b:b3`):
 *  · Sólo direcciones ya acreditadas del lote (allowlist explícita).
 *  · Búsqueda por DIRECCIÓN. Prohibido descubrimiento de negocios/POI.
 *  · Una máquina · un hilo · secuencial · ≥ 1500 ms entre peticiones.
 *  · User-Agent identificable + contacto técnico.
 *  · Cero autocomplete · cero llamadas desde el navegador.
 *  · Resultado cacheado en disco: una segunda ejecución NO vuelve a
 *    consultar Nominatim mientras el caché siga vigente.
 *  · Atribución conservada: © OpenStreetMap contributors · ODbL 1.0.
 *
 * Salida: `docs/governance/evidence/g8-r1-f1b-b3/geocode-cache.json`
 * (caché + evidencia). Este script NO escribe en la base de datos.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
export const USER_AGENT =
  "ValladolidMX-EditorialGeocoder/1.0 (one-off batch G8-R1-F1B-B3; contacto: hola@quehacerenvalladolid.com)";
export const MIN_INTERVAL_MS = 1500;
export const LICENSE = "ODbL-1.0";
export const ATTRIBUTION = "© OpenStreetMap contributors · ODbL 1.0";
export const CACHE_TTL_DAYS = 180;
export const EVIDENCE_DIR = "docs/governance/evidence/g8-r1-f1b-b3";
export const CACHE_PATH = `${EVIDENCE_DIR}/geocode-cache.json`;

/** Centros territoriales acreditados (referencia de coherencia, jamás fallback). */
export const TERRITORIAL_CENTERS = {
  valladolid: { lat: 20.6896, lon: -88.2011, municipality: "Valladolid", maxKm: 6 },
  tinum: { lat: 20.6843, lon: -88.5678, municipality: "Tinúm", maxKm: 12 },
  temozon: { lat: 20.8018, lon: -88.2003, municipality: "Temozón", maxKm: 10 },
};

/** Allowlist: sólo estas 10 direcciones acreditadas pueden consultarse. */
export const BATCH_ADDRESSES = [
  {
    slug: "casa-quetzal-valladolid",
    expectedRoad: "Calle 51",
    locationId: "5aff7193-4c58-42cf-aef3-4c62d42b44af",
    destination: "valladolid",
    query: "Calle 51 218, Centro, Valladolid, Yucatán, México",
  },
  {
    slug: "el-sazon-de-valladolid",
    expectedRoad: "Calle 41",
    locationId: "6de4976d-412c-48c6-9c1d-cd7e78532e38",
    destination: "valladolid",
    query: "Calle 41, Valladolid, Yucatán, México",
  },
  {
    slug: "hotel-bernardino-valladolid",
    expectedRoad: "Calle 54A",
    locationId: "303f7a3f-e98d-4c2d-8d6d-8e206000afaa",
    destination: "valladolid",
    query: "Calle 54A 217, Sisal, Valladolid, Yucatán, México",
  },
  {
    slug: "hotel-chichen-itza-mayaland",
    expectedRoad: null,
    locationId: "18cf0a1e-0b00-465b-8d18-9a7ee837568d",
    destination: "tinum",
    query: "Pisté, Tinúm, Yucatán, México",
  },
  {
    slug: "hotel-olbil",
    expectedRoad: "Calle 28",
    locationId: "fa470695-2bfd-418c-9a32-6687dce9fb78",
    destination: "valladolid",
    query: "Calle 28, Santa Ana, Valladolid, Yucatán, México",
  },
  {
    slug: "lemuuch-hotel-boutique",
    expectedRoad: "Calle 42",
    locationId: "ceaf8a00-2281-4232-9c81-9949078cddb1",
    destination: "valladolid",
    query: "Calle 42, Centro, Valladolid, Yucatán, México",
  },
  {
    slug: "paladar-de-cura",
    expectedRoad: "Calle 54A",
    locationId: "5395f85a-71d0-4615-b0a1-076f69476ef6",
    destination: "valladolid",
    query: "Calle 54A 213, Sisal, Valladolid, Yucatán, México",
  },
  {
    slug: "sikil-restaurante",
    expectedRoad: "Calle 40",
    locationId: "d82a55da-7c24-4125-8cf9-66b1783400cd",
    destination: "valladolid",
    query: "Calle 40 211, San Juan, Valladolid, Yucatán, México",
  },
  {
    slug: "sutuk-hotel-valladolid",
    expectedRoad: "Calle 42",
    locationId: "9f457d4e-6871-4b31-9094-0b0a875f978a",
    destination: "valladolid",
    query: "Calle 42 159, Valladolid, Yucatán, México",
  },
  {
    slug: "valladolid-expeditions",
    expectedRoad: "Calle 49",
    locationId: "864540f9-b77a-40f2-ba56-9ce8ada3c6c2",
    destination: "valladolid",
    query: "Calle 49, Sisal, Valladolid, Yucatán, México",
  },
];

/** Distancia Haversine en km (misma fórmula que el motor de proximidad). */
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Precisión declarada a partir de la clase/tipo OSM. Nunca se infla. */
export function precisionOf(result) {
  if (!result) return "no_resoluble";
  const cls = result.class;
  const type = result.type;
  const addr = result.address ?? {};
  if (cls === "building" || cls === "tourism" || cls === "amenity" || addr.house_number)
    return "edificio";
  if (cls === "highway" || type === "residential" || type === "unclassified" || addr.road)
    return "calle";
  if (type === "village" || type === "town" || type === "city" || type === "hamlet")
    return "localidad";
  if (type === "administrative" || cls === "boundary") return "municipio";
  return "no_resoluble";
}

/** Normaliza "Calle 54-A" / "calle 54a" → "calle54a" para comparar vialidades. */
export function normalizeRoad(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}

/** Veredicto determinista. Sólo edificio/calle coherentes son candidatos. */
export function evaluate(entry, result) {
  const center = TERRITORIAL_CENTERS[entry.destination];
  if (!result) return { accepted: false, precision: "no_resoluble", reason: "sin_resultado" };
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0))
    return { accepted: false, precision: "no_resoluble", reason: "coordenada_invalida" };
  const addr = result.address ?? {};
  const state = String(addr.state ?? "").toLowerCase();
  if (state && !state.includes("yucat"))
    return { accepted: false, precision: "no_resoluble", reason: "otro_estado" };
  const distanceKm = haversineKm(center, { lat, lon });
  const precision = precisionOf(result);
  if (entry.expectedRoad) {
    const got = normalizeRoad(String(addr.road ?? ""));
    if (got && got !== normalizeRoad(entry.expectedRoad))
      return { accepted: false, precision, distanceKm, reason: "calle_no_coincide" };
  }
  if (distanceKm > center.maxKm)
    return { accepted: false, precision, distanceKm, reason: "fuera_de_rango_territorial" };
  if (precision !== "edificio" && precision !== "calle")
    return { accepted: false, precision, distanceKm, reason: "pending_manual_confirmation" };
  return { accepted: true, precision, distanceKm, reason: "coherente" };
}

function isFresh(cached) {
  if (!cached?.queriedAt) return false;
  const ageDays = (Date.now() - new Date(cached.queriedAt).getTime()) / 86400000;
  return ageDays < CACHE_TTL_DAYS;
}

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8")).entries ?? {};
  } catch {
    return {};
  }
}

async function main() {
  const cache = await loadCache();
  let queries = 0;
  for (const entry of BATCH_ADDRESSES) {
    const cached = cache[entry.slug];
    if (isFresh(cached)) {
      console.log(`· cache HIT  ${entry.slug}`);
      continue;
    }
    if (queries > 0) await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
    const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(entry.query)}&format=jsonv2&addressdetails=1&limit=1&countrycodes=mx`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "es" },
    });
    queries += 1;
    const body = res.ok ? await res.json() : [];
    const top = Array.isArray(body) && body.length > 0 ? body[0] : null;
    cache[entry.slug] = {
      slug: entry.slug,
      locationId: entry.locationId,
      destination: entry.destination,
      query: entry.query,
      requestUrl: url,
      queriedAt: new Date().toISOString(),
      httpStatus: res.status,
      license: LICENSE,
      attribution: ATTRIBUTION,
      provider: "nominatim.openstreetmap.org",
      raw: top
        ? {
            lat: Number(top.lat),
            lon: Number(top.lon),
            osm_type: top.osm_type ?? null,
            osm_id: top.osm_id ?? null,
            class: top.class ?? null,
            type: top.type ?? null,
            display_name: top.display_name ?? null,
            address: top.address ?? {},
          }
        : null,
    };
    console.log(`· query      ${entry.slug} → ${top ? top.display_name : "sin resultado"}`);
  }

  for (const entry of BATCH_ADDRESSES) {
    const rec = cache[entry.slug];
    rec.verdict = evaluate(entry, rec.raw);
  }

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    CACHE_PATH,
    `${JSON.stringify(
      {
        generator: "scripts/omxds/r1-f1b-b3/geocode-batch.mjs",
        provider: "nominatim.openstreetmap.org",
        license: LICENSE,
        attribution: ATTRIBUTION,
        userAgent: USER_AGENT,
        minIntervalMs: MIN_INTERVAL_MS,
        cacheTtlDays: CACHE_TTL_DAYS,
        queriesThisRun: queries,
        entries: cache,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\nConsultas realizadas en esta ejecución: ${queries}`);
  for (const entry of BATCH_ADDRESSES) {
    const r = cache[entry.slug];
    console.log(
      `${r.verdict.accepted ? "ACEPTADA " : "RECHAZADA"} ${entry.slug} · ${r.verdict.precision} · ${
        r.verdict.distanceKm ? `${r.verdict.distanceKm.toFixed(2)} km` : "-"
      } · ${r.verdict.reason}`,
    );
  }
}

if (import.meta.main) await main();
