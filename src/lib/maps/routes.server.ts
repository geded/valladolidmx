/**
 * CV6.5.3 · Google Maps Routes — server-only helper.
 *
 * Única puerta cartográfica desde el servidor. Los server fns públicos
 * (`computeRoute`) y los Destination Context Contributors (traffic)
 * consumen esta función; NUNCA se llama Google Routes directamente
 * desde superficies ni desde el cliente.
 *
 * TRAFFIC_AWARE_OPTIMAL entrega duración con condiciones actuales de
 * tráfico. `staticDuration` refleja el tiempo base sin tráfico y
 * permite calcular el delta (usado por el Decision Center para
 * explicar "el tráfico aumentó").
 */

export type TravelMode = "DRIVE" | "WALK" | "BICYCLE" | "TWO_WHEELER";

export interface RouteQuery {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  mode?: TravelMode;
  /** Si true, usa TRAFFIC_AWARE_OPTIMAL (más costoso, más preciso). */
  trafficAware?: boolean;
}

export interface RouteInternalResult {
  ok: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  /** Duración estimada sin tráfico (segundos). */
  staticDurationSeconds: number | null;
  error?: string;
}

export interface RoadRouteInternalResult {
  ok: boolean;
  encodedPolyline: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  error?: string;
}

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !gmKey) {
    throw new Error("Google Maps connector credentials missing");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gmKey,
  } as const;
}

/** Ejecuta una consulta a Routes API v2 con timeout y normaliza la respuesta. */
export async function computeRouteInternal(
  q: RouteQuery,
  opts: { timeoutMs?: number } = {},
): Promise<RouteInternalResult> {
  const mode: TravelMode = q.mode ?? "DRIVE";
  const trafficAware = q.trafficAware ?? mode === "DRIVE";
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 6000);
  try {
    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: q.origin.lat, longitude: q.origin.lon },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: q.destination.lat,
              longitude: q.destination.lon,
            },
          },
        },
        travelMode: mode,
        routingPreference: trafficAware ? "TRAFFIC_AWARE_OPTIMAL" : "TRAFFIC_UNAWARE",
      }),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        staticDuration?: string;
      }>;
      error?: { message?: string };
    };
    if (!res.ok || !body.routes?.length) {
      return {
        ok: false,
        distanceMeters: null,
        durationSeconds: null,
        staticDurationSeconds: null,
        error: body.error?.message ?? `HTTP ${res.status}`,
      };
    }
    const r = body.routes[0];
    const toSec = (s?: string) => (s ? Number(s.replace(/s$/, "")) : null);
    const duration = toSec(r.duration);
    const staticDuration = toSec(r.staticDuration);
    return {
      ok: true,
      distanceMeters: r.distanceMeters ?? null,
      durationSeconds: Number.isFinite(duration) ? duration : null,
      staticDurationSeconds: Number.isFinite(staticDuration) ? staticDuration : null,
    };
  } catch (err) {
    return {
      ok: false,
      distanceMeters: null,
      durationSeconds: null,
      staticDurationSeconds: null,
      error: err instanceof Error ? err.message : "Route computation failed",
    };
  } finally {
    clearTimeout(t);
  }
}

function decodeLine(encoded: string): Array<[number, number]> {
  const path: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    path.push([lat, lng]);
  }
  return path;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  out += String.fromCharCode(v + 63);
  return out;
}

/** Une varias geometrías viales en una sola polilínea codificada. */
function encodeLine(points: Array<[number, number]>): string {
  let lat = 0;
  let lng = 0;
  let out = "";
  for (const [la, ln] of points) {
    out += encodeValue(la - lat) + encodeValue(ln - lng);
    lat = la;
    lng = ln;
  }
  return out;
}

/**
 * Calcula la geometría vial de una ruta editorial publicada.
 *
 * Primero pide el recorrido completo en una sola llamada. Si el proveedor
 * no lo resuelve (alguna parada queda fuera de la red vial acreditada),
 * calcula tramo por tramo y une los que sí existen: la ruta se dibuja sobre
 * carretera aunque una parada aislada no sea enrutable.
 */
export async function computeRoadRouteInternal(
  points: Array<{ lat: number; lng: number }>,
  opts: { timeoutMs?: number } = {},
): Promise<RoadRouteInternalResult> {
  const single = await computeRoadRouteSingle(points, opts);
  if (single.ok && single.encodedPolyline) return single;

  const safe = points
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .slice(0, 12);
  if (safe.length < 2) return single;

  const legs = await Promise.all(
    safe.slice(0, -1).map((from, i) => computeRoadRouteSingle([from, safe[i + 1]!], opts)),
  );
  const merged: Array<[number, number]> = [];
  let distance = 0;
  let duration = 0;
  let any = false;
  for (const leg of legs) {
    if (!leg.ok || !leg.encodedPolyline) continue;
    any = true;
    distance += leg.distanceMeters ?? 0;
    duration += leg.durationSeconds ?? 0;
    for (const point of decodeLine(leg.encodedPolyline)) merged.push(point);
  }
  if (!any || merged.length < 2) return single;

  return {
    ok: true,
    encodedPolyline: encodeLine(merged),
    distanceMeters: distance || null,
    durationSeconds: duration || null,
  };
}

async function computeRoadRouteSingle(
  points: Array<{ lat: number; lng: number }>,
  opts: { timeoutMs?: number } = {},
): Promise<RoadRouteInternalResult> {
  const safePoints = points
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .slice(0, 12);
  const origin = safePoints[0];
  const destination = safePoints.at(-1);
  if (!origin || !destination || safePoints.length < 2) {
    return { ok: false, encodedPolyline: null, distanceMeters: null, durationSeconds: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 6000);
  try {
    const response = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        intermediates: safePoints.slice(1, -1).map((point) => ({
          location: { latLng: { latitude: point.lat, longitude: point.lng } },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        polylineQuality: "HIGH_QUALITY",
        polylineEncoding: "ENCODED_POLYLINE",
      }),
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as {
      routes?: Array<{
        polyline?: { encodedPolyline?: string };
        distanceMeters?: number;
        duration?: string;
      }>;
      error?: { message?: string };
    };
    const route = body.routes?.[0];
    if (!response.ok || !route?.polyline?.encodedPolyline) {
      return {
        ok: false,
        encodedPolyline: null,
        distanceMeters: null,
        durationSeconds: null,
        error: body.error?.message ?? `HTTP ${response.status}`,
      };
    }
    const seconds = route.duration ? Number(route.duration.replace(/s$/, "")) : null;
    return {
      ok: true,
      encodedPolyline: route.polyline.encodedPolyline,
      distanceMeters: route.distanceMeters ?? null,
      durationSeconds: Number.isFinite(seconds) ? seconds : null,
    };
  } catch (error) {
    return {
      ok: false,
      encodedPolyline: null,
      distanceMeters: null,
      durationSeconds: null,
      error: error instanceof Error ? error.message : "Route computation failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
