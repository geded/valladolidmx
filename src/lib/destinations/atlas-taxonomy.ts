/**
 * Atlas de Destinos — taxonomía territorial y cercanía.
 *
 * Reglas de producto:
 *  - Los Pueblos Mágicos del Oriente Maya son Valladolid, Izamal y Espita.
 *  - La distancia sólo se muestra cuando existe dato administrado
 *    (coordenadas del origen y del destino). Nunca se inventa.
 */
import type { Destination } from "@/types/territory";

export type TerritoryType = "ciudad" | "pueblo" | "comunidad" | "costa" | "naturaleza";

export const PUEBLOS_MAGICOS = new Set(["valladolid", "izamal", "espita"]);
const COASTAL = new Set([
  "el-cuyo",
  "las-coloradas",
  "rio-lagartos",
  "san-felipe",
  "dzilam-de-bravo",
]);
const CITIES = new Set(["valladolid", "tizimin", "izamal"]);

export const TERRITORY_TYPE_LABELS: Record<TerritoryType, string> = {
  ciudad: "Ciudad",
  pueblo: "Pueblo",
  comunidad: "Comunidad",
  costa: "Costa",
  naturaleza: "Naturaleza",
};

export type AtlasInterest =
  | "cultura-maya"
  | "cenotes-naturaleza"
  | "pueblos-historia"
  | "gastronomia"
  | "costa-tranquilidad";

export const ATLAS_INTEREST_LABELS: Record<AtlasInterest, string> = {
  "cultura-maya": "Cultura maya",
  "cenotes-naturaleza": "Cenotes y naturaleza",
  "pueblos-historia": "Pueblos con historia",
  gastronomia: "Gastronomía",
  "costa-tranquilidad": "Costa y tranquilidad",
};

function haystack(destination: Destination): string {
  return `${destination.name} ${destination.tagline} ${destination.highlights.join(" ")}`.toLocaleLowerCase(
    "es",
  );
}

export function classifyTerritoryType(destination: Destination): TerritoryType {
  if (COASTAL.has(destination.slug)) return "costa";
  if (CITIES.has(destination.slug)) return "ciudad";
  const text = haystack(destination);
  if (/reserva|selva|cenote|flamenco|manglar|naturaleza/.test(text)) return "naturaleza";
  if (/comunidad|ejido|artesan/.test(text)) return "comunidad";
  return "pueblo";
}

export function classifyInterests(destination: Destination): AtlasInterest[] {
  const text = haystack(destination);
  const interests = new Set<AtlasInterest>();
  if (/maya|arqueol|pirámide|acrópolis|convento|historia/.test(text)) interests.add("cultura-maya");
  if (/cenote|reserva|manglar|flamenco|naturaleza|selva/.test(text))
    interests.add("cenotes-naturaleza");
  if (PUEBLOS_MAGICOS.has(destination.slug) || /pueblo|colonial|barroc/.test(text))
    interests.add("pueblos-historia");
  if (/cocina|gastronom|sabor|mercado|comida/.test(text)) interests.add("gastronomia");
  if (COASTAL.has(destination.slug) || /playa|costa|golfo|salinera/.test(text))
    interests.add("costa-tranquilidad");
  if (interests.size === 0) interests.add("pueblos-historia");
  return [...interests];
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Estimación conservadora en carretera regional (55 km/h efectivos). */
export function estimateDriveMinutes(km: number): number {
  return Math.max(5, Math.round((km / 55) * 60 * 1.2));
}

export type ProximityInfo = { km: number; minutes: number; source: "administered" | "fixture" };

export function proximityFrom(
  origin: Destination | null,
  destination: Destination,
): ProximityInfo | null {
  if (!origin || origin.slug === destination.slug) return null;
  if (
    typeof origin.latitude !== "number" ||
    typeof origin.longitude !== "number" ||
    typeof destination.latitude !== "number" ||
    typeof destination.longitude !== "number"
  ) {
    return null;
  }
  const km = haversineKm(
    { lat: origin.latitude, lng: origin.longitude },
    { lat: destination.latitude, lng: destination.longitude },
  );
  return { km: Math.round(km), minutes: estimateDriveMinutes(km), source: "administered" };
}

export function formatProximity(info: ProximityInfo): string {
  const hours = Math.floor(info.minutes / 60);
  const minutes = info.minutes % 60;
  const time = hours > 0 ? `${hours} h${minutes ? ` ${minutes} min` : ""}` : `${info.minutes} min`;
  return `${info.km} km · ${time} aprox.`;
}
