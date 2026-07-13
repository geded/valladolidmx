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
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.staticDuration",
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
    const toSec = (s?: string) =>
      s ? Number(s.replace(/s$/, "")) : null;
    const duration = toSec(r.duration);
    const staticDuration = toSec(r.staticDuration);
    return {
      ok: true,
      distanceMeters: r.distanceMeters ?? null,
      durationSeconds: Number.isFinite(duration) ? duration : null,
      staticDurationSeconds: Number.isFinite(staticDuration)
        ? staticDuration
        : null,
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
