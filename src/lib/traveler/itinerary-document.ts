/**
 * Itinerario con marca — modelo puro (sin React, sin red).
 *
 * Convierte las paradas ya guardadas de un viaje (`travel_plan_items`) en
 * días fáciles de seguir: fecha legible, hora, fin estimado, cómo llegar y
 * traslado aproximado a la siguiente parada. No inventa datos: sin
 * coordenadas acreditadas no hay traslado; sin hora se muestra «Sin hora».
 */
import { haversineKm, isValidPoint, type GeoPoint } from "@/lib/alux/proximity";

export interface ItineraryItemInput {
  id: string;
  item_kind: string;
  target_id: string | null;
  position: number;
  day_index: number | null;
  starts_at_local?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
  snapshot?: object | null;
}

export interface ItineraryLeg {
  km: number;
  minutes: number;
  mode: "walk" | "drive";
}

export interface ItineraryStop {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  time: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  coords: GeoPoint | null;
  mapsUrl: string;
  reserved: boolean;
  note: string | null;
  /** Traslado estimado hacia la siguiente parada del mismo día. */
  legToNext: ItineraryLeg | null;
}

export interface ItineraryDay {
  key: string;
  dayIndex: number | null;
  title: string;
  dateLabel: string | null;
  stops: ItineraryStop[];
}

export interface ItineraryNote {
  id: string;
  title: string;
  body: string | null;
}

export interface ItineraryModel {
  days: ItineraryDay[];
  notes: ItineraryNote[];
  destinations: string[];
  stopCount: number;
  datedDayCount: number;
}

/** Factor de calle sobre línea recta y velocidades medias del Oriente Maya. */
const ROAD_FACTOR = 1.3;
const WALK_MAX_KM = 1.5;
const WALK_KMH = 4.5;
const TOWN_KMH = 40;
const HIGHWAY_KMH = 75;

export function estimateLeg(a: GeoPoint, b: GeoPoint): ItineraryLeg {
  const km = Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10;
  if (km <= WALK_MAX_KM) {
    return { km, minutes: Math.max(1, Math.round((km / WALK_KMH) * 60)), mode: "walk" };
  }
  const speed = km > 25 ? HIGHWAY_KMH : TOWN_KMH;
  return { km, minutes: Math.max(1, Math.round((km / speed) * 60)), mode: "drive" };
}

export function formatLeg(leg: ItineraryLeg): string {
  const time =
    leg.minutes >= 60
      ? `${Math.floor(leg.minutes / 60)} h ${String(leg.minutes % 60).padStart(2, "0")} min`
      : `${leg.minutes} min`;
  return `≈ ${time} ${leg.mode === "walk" ? "a pie" : "en auto"} · ${leg.km.toLocaleString("es-MX")} km`;
}

/** Suma minutos a una hora HH:MM; devuelve null si no cabe en el mismo día. */
export function addMinutes(time: string | null, minutes: number | null): string | null {
  if (!time || !minutes || minutes <= 0) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + minutes;
  if (total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Fecha legible del día N del viaje («viernes 25 de julio»). */
export function dayDateLabel(startDate: string | null, dayIndex: number): string | null {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  const d = new Date(`${startDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + dayIndex);
  const label = d
    .toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    })
    .replace(",", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function directionsUrl(coords: GeoPoint | null, title: string): string {
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title}, Yucatán, México`)}`;
}

function cleanText(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  hotel: "Hospedaje",
  hospedaje: "Hospedaje",
  restaurante: "Restaurante",
  experiencia: "Experiencia",
  tour: "Tour",
};

/**
 * Nombre visible de una parada. Las paradas armadas por el concierge
 * guardan `name`/`label`; las del viajero, `title`. Nunca «Elemento».
 */
export function snapshotTitle(snapshot: unknown): string | null {
  const s = (snapshot && typeof snapshot === "object" ? snapshot : {}) as Record<string, unknown>;
  return cleanText(s.title) ?? cleanText(s.name) ?? cleanText(s.label);
}

/** Línea secundaria: subtítulo guardado o «Tipo · Empresa» del concierge. */
export function snapshotSubtitle(snapshot: unknown): string | null {
  const s = (snapshot && typeof snapshot === "object" ? snapshot : {}) as Record<string, unknown>;
  const explicit = cleanText(s.subtitle);
  if (explicit) return explicit;
  const type = cleanText(s.product_type);
  const typeLabel = type ? (PRODUCT_TYPE_LABEL[type.toLowerCase()] ?? type) : null;
  const business = cleanText(s.business);
  const parts = [typeLabel, business].filter((v): v is string => Boolean(v));
  return parts.length ? parts.join(" · ") : null;
}

export function buildItineraryModel(
  items: readonly ItineraryItemInput[],
  options: {
    startDate: string | null;
    geo?: ReadonlyMap<string, GeoPoint>;
    reservedTargetIds?: ReadonlySet<string>;
  },
): ItineraryModel {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const notes: ItineraryNote[] = [];
  const destinations: string[] = [];
  const byDay = new Map<number | "none", ItineraryStop[]>();
  const hasAnyDay = sorted.some((i) => typeof i.day_index === "number" && i.item_kind !== "note");

  for (const item of sorted) {
    const title = snapshotTitle(item.snapshot) ?? (item.item_kind === "note" ? "Nota" : "Parada");
    if (item.item_kind === "note") {
      notes.push({
        id: item.id,
        title,
        body: cleanText(item.notes) ?? snapshotSubtitle(item.snapshot),
      });
      continue;
    }
    const day = typeof item.day_index === "number" && item.day_index >= 0 ? item.day_index : null;
    if (item.item_kind === "destination" && day === null && hasAnyDay) {
      destinations.push(title);
      continue;
    }
    if (item.item_kind === "destination") destinations.push(title);
    const rawGeo = options.geo?.get(item.id) ?? null;
    const coords = rawGeo && isValidPoint(rawGeo) ? { lat: rawGeo.lat, lng: rawGeo.lng } : null;
    const time = cleanText(item.starts_at_local);
    const duration =
      typeof item.duration_minutes === "number" && item.duration_minutes > 0
        ? item.duration_minutes
        : null;
    const stop: ItineraryStop = {
      id: item.id,
      kind: item.item_kind,
      title,
      subtitle: snapshotSubtitle(item.snapshot),
      imageUrl: cleanText((item.snapshot as Record<string, unknown> | null)?.["image_url"]),
      time,
      endTime: addMinutes(time, duration),
      durationMinutes: duration,
      coords,
      mapsUrl: directionsUrl(coords, title),
      reserved: Boolean(item.target_id && options.reservedTargetIds?.has(item.target_id)),
      note: cleanText(item.notes),
      legToNext: null,
    };
    const key = day ?? "none";
    const list = byDay.get(key) ?? [];
    list.push(stop);
    byDay.set(key, list);
  }

  const keys = [...byDay.keys()].sort((a, b) => {
    if (a === "none") return 1;
    if (b === "none") return -1;
    return a - b;
  });

  const days: ItineraryDay[] = keys.map((key) => {
    const stops = byDay.get(key) ?? [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]?.coords;
      const b = stops[i + 1]?.coords;
      const current = stops[i];
      if (current && a && b) current.legToNext = estimateLeg(a, b);
    }
    if (key === "none") {
      return {
        key: "none",
        dayIndex: null,
        title: hasAnyDay ? "Por agendar" : "Tu recorrido",
        dateLabel: null,
        stops,
      };
    }
    return {
      key: `day-${key}`,
      dayIndex: key,
      title: `Día ${key + 1}`,
      dateLabel: dayDateLabel(options.startDate, key),
      stops,
    };
  });

  return {
    days,
    notes,
    destinations: [...new Set(destinations)],
    stopCount: days.reduce((n, d) => n + d.stops.length, 0),
    datedDayCount: days.filter((d) => d.dayIndex !== null).length,
  };
}
