/**
 * G8-R1-E-R1 · Proximidad acreditada (Addendum DEF-R1E-002).
 *
 * Capa PURA. Reglas vinculantes:
 *  · Sólo se calcula distancia si el navegador otorgó geolocalización.
 *  · Sólo se calcula contra coordenadas ACREDITADAS del catálogo canónico.
 *  · Candidato sin coordenadas: sigue siendo recomendable por afinidad y
 *    territorio, pero NUNCA recibe etiqueta de distancia ni entra en el
 *    orden "Cerca de mí".
 *  · Cero distancias inventadas: prohibido derivar centroides no
 *    almacenados oficialmente.
 *  · La ubicación precisa no se persiste en señales ni eventos.
 */

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/** Origen acreditado de las coordenadas de un candidato. */
export type CoordsSource =
  | "poi"
  | "business_location"
  | "product_operator"
  | "event_venue"
  | "destination";

export interface AccreditedCoords extends GeoPoint {
  readonly source: CoordsSource;
}

export function isValidPoint(value: unknown): value is GeoPoint {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<GeoPoint>;
  return (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180 &&
    !(p.lat === 0 && p.lng === 0)
  );
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia haversine en km, redondeada a 2 decimales. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s))) * 100) / 100;
}

export interface ProximityInput<T> {
  readonly candidates: readonly T[];
  /** Ubicación del visitante; `null` si no hay consentimiento del navegador. */
  readonly origin: GeoPoint | null;
  readonly consentGranted: boolean;
  readonly getCoords: (candidate: T) => AccreditedCoords | null | undefined;
}

/**
 * Devuelve los candidatos con `distanceKm` cuando —y sólo cuando— hay
 * consentimiento, origen válido y coordenadas acreditadas.
 */
export function attachDistance<T extends object>(
  input: ProximityInput<T>,
): readonly (T & { distanceKm?: number; distanceSource?: CoordsSource })[] {
  const { origin, consentGranted } = input;
  if (!consentGranted || !origin || !isValidPoint(origin)) {
    return input.candidates.map((c) => ({ ...c }));
  }
  return input.candidates.map((candidate) => {
    const coords = input.getCoords(candidate);
    if (!coords || !isValidPoint(coords)) return { ...candidate };
    return {
      ...candidate,
      distanceKm: haversineKm(origin, coords),
      distanceSource: coords.source,
    };
  });
}

/**
 * Orden "Cerca de mí": excluye de forma segura a los candidatos sin
 * distancia acreditada (no los degrada al final: los deja fuera).
 */
export function sortByProximity<T extends { distanceKm?: number }>(
  candidates: readonly T[],
): readonly T[] {
  return candidates
    .filter((c) => typeof c.distanceKm === "number")
    .slice()
    .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
}

/** Etiqueta humana. `null` cuando no hay distancia acreditada. */
export function formatDistance(distanceKm: number | undefined): string | null {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `a ${Math.round(distanceKm * 1000)} m`;
  return `a ${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}
