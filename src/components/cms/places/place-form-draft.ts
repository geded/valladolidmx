/**
 * place-form-draft.ts — Forma del formulario de Lugares para su respaldo
 * local (`@/lib/cms/local-draft`). Puro: sin React ni servidor.
 */

export const PLACE_TEXT_FIELDS = [
  "official_name",
  "short_description",
  "description",
  "directions",
  "address_line",
  "google_place_id",
  "best_time_to_visit",
  "entry_fee_notes",
  "contact_phone",
  "contact_whatsapp",
  "contact_email",
  "contact_website",
  "price_currency",
] as const;

export interface PlaceFormState {
  values: Record<string, string>;
  zoneId: string;
  admission: string;
  attractionFamily: string;
  priceFrom: string;
  priceTo: string;
  duration: string;
  highlights: string;
  amenities: string;
  accessibility: string;
  latitude: string;
  longitude: string;
  categoryIds: string[];
}

export interface NewPlaceState {
  name: string;
  slug: string;
  destination_id: string;
  destination_zone_id: string;
  place_type_id: string;
  description: string;
}

export const EMPTY_NEW_PLACE: NewPlaceState = {
  name: "",
  slug: "",
  destination_id: "",
  destination_zone_id: "",
  place_type_id: "",
  description: "",
};

const numberText = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Convierte el lugar guardado en los valores que muestra el formulario. */
export function placeToForm(
  place: Record<string, unknown>,
  categoryIds: string[] | undefined,
): PlaceFormState {
  const values: Record<string, string> = {};
  for (const key of PLACE_TEXT_FIELDS) values[key] = (place[key] as string | null) ?? "";
  /* Accesibilidad real capturada como lista de rasgos declarados. */
  const acc = place.accessibility as Record<string, unknown> | null;
  return {
    values,
    zoneId: (place.destination_zone_id as string | null) ?? "",
    admission: (place.admission_kind as string | null) ?? "",
    attractionFamily: (place.attraction_family as string | null) ?? "",
    priceFrom: numberText(place.price_from),
    priceTo: numberText(place.price_to),
    duration: numberText(place.visit_duration_minutes),
    highlights: Array.isArray(place.highlights) ? (place.highlights as string[]).join("\n") : "",
    amenities: Array.isArray(place.amenities) ? (place.amenities as string[]).join("\n") : "",
    accessibility:
      acc && typeof acc === "object"
        ? Object.entries(acc)
            .filter(([, v]) => v === true || (typeof v === "string" && v.trim().length > 0))
            .map(([k, v]) => (typeof v === "string" ? `${k}: ${v}` : k))
            .join("\n")
        : "",
    latitude: numberText(place.latitude),
    longitude: numberText(place.longitude),
    categoryIds: categoryIds ?? [],
  };
}

const PLACE_STRING_KEYS = [
  "zoneId",
  "admission",
  "attractionFamily",
  "priceFrom",
  "priceTo",
  "duration",
  "highlights",
  "amenities",
  "accessibility",
  "latitude",
  "longitude",
] as const;

export function sanitizePlaceFormDraft(raw: unknown): PlaceFormState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!r.values || typeof r.values !== "object" || Array.isArray(r.values)) return null;
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.values as Record<string, unknown>)) {
    if (typeof v === "string") values[k] = v;
  }
  const out = { values } as PlaceFormState;
  for (const key of PLACE_STRING_KEYS) {
    const v = r[key];
    if (typeof v !== "string") return null;
    out[key] = v;
  }
  if (!Array.isArray(r.categoryIds) || !r.categoryIds.every((c) => typeof c === "string")) {
    return null;
  }
  out.categoryIds = r.categoryIds as string[];
  return out;
}

export function sanitizeNewPlaceDraft(raw: unknown): NewPlaceState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out = { ...EMPTY_NEW_PLACE };
  for (const key of Object.keys(EMPTY_NEW_PLACE) as (keyof NewPlaceState)[]) {
    const v = r[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}
