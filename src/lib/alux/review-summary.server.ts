/**
 * Alux · Resumen de reseñas (server-only).
 *
 * 1. Resuelve la entidad publicada (negocio, lugar, el negocio dueño de un
 *    producto o evento, o la sede de un evento) con las reglas públicas.
 * 2. Si aún no tiene identificador de Google, lo busca una vez (Text Search
 *    acotado a 500 m) y lo guarda sólo si coincide a ≤ 250 m. Si no hay
 *    coincidencia, registra el intento para no repetir la búsqueda en 30 días.
 * 3. Pide a Google el resumen oficial de reseñas (`reviewSummary`) en español.
 *
 * Nunca guarda el texto de Google. Cualquier falla devuelve «no disponible».
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_BUSINESS_ELIGIBILITY_EQ } from "@/lib/omxds/public-eligibility";
import {
  isAcceptableGoogleMatch,
  shouldRetryMatch,
  type AluxReviewSummaryResult,
  type ReviewEntityRef,
} from "./review-summary-contract";
import { isValidPoint, type GeoPoint } from "./proximity";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const UNAVAILABLE = { available: false } as const;

interface Subject {
  readonly table: "businesses" | "points_of_interest" | "events";
  readonly id: string;
  readonly name: string;
  readonly destinationName: string | null;
  readonly coords: GeoPoint | null;
  readonly googlePlaceId: string | null;
  readonly matchedAt: string | null;
}

interface GoogleReviewSummary {
  text?: { text?: string };
  disclosureText?: { text?: string };
  reviewsUri?: string;
  flagContentUri?: string;
}

function point(lat: unknown, lng: unknown): GeoPoint | null {
  if (lat == null || lng == null) return null;
  const p = { lat: Number(lat), lng: Number(lng) };
  return isValidPoint(p) ? p : null;
}

async function loadBusiness(sb: SupabaseClient, id: string): Promise<Subject | null> {
  const { data } = await sb
    .from("businesses")
    .select(
      "id, display_name, google_place_id, google_place_matched_at, destinations ( name ), business_locations ( latitude, longitude, is_primary )",
    )
    .eq("id", id)
    .eq("status", "published")
    .is("deleted_at", null)
    .eq(...PUBLIC_BUSINESS_ELIGIBILITY_EQ)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const locs = (row["business_locations"] as Array<Record<string, unknown>> | null) ?? [];
  const loc = locs.find((l) => l["is_primary"] === true) ?? locs[0];
  const dest = row["destinations"] as { name?: unknown } | null;
  return {
    table: "businesses",
    id: String(row["id"]),
    name: String(row["display_name"] ?? ""),
    destinationName: typeof dest?.name === "string" ? dest.name : null,
    coords: loc ? point(loc["latitude"], loc["longitude"]) : null,
    googlePlaceId: (row["google_place_id"] as string | null) ?? null,
    matchedAt: (row["google_place_matched_at"] as string | null) ?? null,
  };
}

async function loadPlace(sb: SupabaseClient, id: string): Promise<Subject | null> {
  const { data } = await sb
    .from("points_of_interest")
    .select(
      "id, name, latitude, longitude, google_place_id, google_place_matched_at, destinations ( name )",
    )
    .eq("id", id)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const dest = row["destinations"] as { name?: unknown } | null;
  return {
    table: "points_of_interest",
    id: String(row["id"]),
    name: String(row["name"] ?? ""),
    destinationName: typeof dest?.name === "string" ? dest.name : null,
    coords: point(row["latitude"], row["longitude"]),
    googlePlaceId: (row["google_place_id"] as string | null) ?? null,
    matchedAt: (row["google_place_matched_at"] as string | null) ?? null,
  };
}

/** Evento: reseñas del negocio que lo ofrece; si no tiene, las de su sede. */
async function loadEvent(sb: SupabaseClient, id: string): Promise<Subject | null> {
  const { data } = await sb
    .from("events")
    .select(
      "id, business_id, venue_name, latitude, longitude, google_place_id, google_place_matched_at, destinations ( name )",
    )
    .eq("id", id)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  if (typeof row["business_id"] === "string") return loadBusiness(sb, row["business_id"]);
  const venue = typeof row["venue_name"] === "string" ? row["venue_name"].trim() : "";
  if (!venue) return null;
  const dest = row["destinations"] as { name?: unknown } | null;
  return {
    table: "events",
    id: String(row["id"]),
    name: venue,
    destinationName: typeof dest?.name === "string" ? dest.name : null,
    coords: point(row["latitude"], row["longitude"]),
    googlePlaceId: (row["google_place_id"] as string | null) ?? null,
    matchedAt: (row["google_place_matched_at"] as string | null) ?? null,
  };
}

async function resolveSubject(sb: SupabaseClient, ref: ReviewEntityRef): Promise<Subject | null> {
  if (ref.kind === "business") return loadBusiness(sb, ref.id);
  if (ref.kind === "place") return loadPlace(sb, ref.id);
  if (ref.kind === "event") return loadEvent(sb, ref.id);
  const { data } = await sb
    .from("products")
    .select("business_id")
    .eq("id", ref.id)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  const businessId = (data as { business_id?: string } | null)?.business_id;
  return businessId ? loadBusiness(sb, businessId) : null;
}

function gatewayHeaders(fieldMask: string): Record<string, string> | null {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    console.error("[alux.review-summary] missing Google Maps connector credentials");
    return null;
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
    "X-Goog-FieldMask": fieldMask,
  };
}

async function logFailure(res: Response, step: string): Promise<void> {
  const body = (await res.text()).slice(0, 400);
  console.error(`[alux.review-summary] ${step} failed [${res.status}]: ${body}`);
}

/** Busca el lugar en Google y devuelve id + resumen si coincide a ≤ 250 m. */
async function matchOnGoogle(
  subject: Subject & { coords: GeoPoint },
): Promise<{ placeId: string; summary: GoogleReviewSummary | null } | null> {
  const headers = gatewayHeaders("places.id,places.location,places.reviewSummary");
  if (!headers) return null;
  const textQuery = [subject.name, subject.destinationName, "Yucatán"].filter(Boolean).join(", ");
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      textQuery,
      languageCode: "es",
      regionCode: "MX",
      pageSize: 3,
      locationBias: {
        circle: {
          center: { latitude: subject.coords.lat, longitude: subject.coords.lng },
          radius: 500,
        },
      },
    }),
  });
  if (!res.ok) {
    await logFailure(res, "searchText");
    throw new Error("google_search_failed");
  }
  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      location?: { latitude?: number; longitude?: number };
      reviewSummary?: GoogleReviewSummary;
    }>;
  };
  for (const p of json.places ?? []) {
    const g = point(p.location?.latitude, p.location?.longitude);
    if (p.id && g && isAcceptableGoogleMatch(subject.coords, g)) {
      return { placeId: p.id, summary: p.reviewSummary ?? null };
    }
  }
  return null;
}

async function fetchSummary(placeId: string): Promise<GoogleReviewSummary | null> {
  const headers = gatewayHeaders("reviewSummary");
  if (!headers || !/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) return null;
  const res = await fetch(
    `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=MX`,
    { headers },
  );
  if (!res.ok) {
    await logFailure(res, "placeDetails");
    return null;
  }
  const json = (await res.json()) as { reviewSummary?: GoogleReviewSummary };
  return json.reviewSummary ?? null;
}

export async function loadAluxReviewSummary(
  admin: SupabaseClient,
  ref: ReviewEntityRef,
): Promise<AluxReviewSummaryResult> {
  const subject = await resolveSubject(admin, ref);
  if (!subject || !subject.name) return UNAVAILABLE;

  let placeId = subject.googlePlaceId;
  let summary: GoogleReviewSummary | null = null;

  if (!placeId) {
    if (!subject.coords || !shouldRetryMatch(subject.matchedAt)) return UNAVAILABLE;
    let match: Awaited<ReturnType<typeof matchOnGoogle>> = null;
    try {
      match = await matchOnGoogle({ ...subject, coords: subject.coords });
    } catch {
      // Falla temporal de Google: no se registra intento para reintentar luego.
      return UNAVAILABLE;
    }
    const patch: Record<string, unknown> = { google_place_matched_at: new Date().toISOString() };
    if (match) patch["google_place_id"] = match.placeId;
    const { error } = await admin.from(subject.table).update(patch).eq("id", subject.id);
    if (error) console.error("[alux.review-summary] link save failed", error.message);
    if (!match) return UNAVAILABLE;
    placeId = match.placeId;
    summary = match.summary;
  } else {
    summary = await fetchSummary(placeId);
  }

  const text = summary?.text?.text?.trim();
  const disclosure = summary?.disclosureText?.text?.trim();
  if (!text || !disclosure) return UNAVAILABLE;
  return {
    available: true,
    subjectName: subject.name,
    subjectCoords: subject.coords,
    text,
    disclosureText: disclosure,
    reviewsUri: summary?.reviewsUri ?? null,
    flagContentUri: summary?.flagContentUri ?? null,
  };
}
