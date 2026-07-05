/**
 * Google Maps · Server Functions
 *
 * Todas las llamadas a Google Maps Platform pasan por el gateway con
 * `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY`. Nunca desde el navegador
 * (evita CORS y no expone credenciales). Los resultados son cacheables.
 *
 * Endpoints usados:
 *  - Geocoding API v1 (legacy): /maps/api/geocode/json
 *  - Routes API v2:            /routes/directions/v2:computeRoutes
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

/* ------------------------------------------------------------------ *
 * Geocoding: dirección → { lat, lng, formatted }
 * ------------------------------------------------------------------ */

const GeocodeInput = z.object({
  address: z.string().min(3).max(300),
});

export type GeocodeResult = {
  ok: boolean;
  lat: number | null;
  lng: number | null;
  formatted: string | null;
  error?: string;
};

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GeocodeInput.parse(input))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    try {
      const url = new URL(`${GATEWAY}/maps/api/geocode/json`);
      url.searchParams.set("address", data.address);
      const res = await fetch(url, { headers: gatewayHeaders() });
      const body = (await res.json()) as {
        status?: string;
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
        error_message?: string;
      };
      if (!res.ok || body.status !== "OK" || !body.results?.length) {
        return {
          ok: false,
          lat: null,
          lng: null,
          formatted: null,
          error: body.error_message ?? body.status ?? `HTTP ${res.status}`,
        };
      }
      const first = body.results[0];
      const loc = first.geometry?.location;
      return {
        ok: true,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        formatted: first.formatted_address ?? null,
      };
    } catch (err) {
      return {
        ok: false,
        lat: null,
        lng: null,
        formatted: null,
        error: err instanceof Error ? err.message : "Geocoding failed",
      };
    }
  });

/* ------------------------------------------------------------------ *
 * Routes API v2: distancia + duración entre dos puntos
 * ------------------------------------------------------------------ */

const RouteInput = z.object({
  originLat: z.number().gte(-90).lte(90),
  originLng: z.number().gte(-180).lte(180),
  destLat: z.number().gte(-90).lte(90),
  destLng: z.number().gte(-180).lte(180),
  travelMode: z.enum(["DRIVE", "WALK", "BICYCLE", "TWO_WHEELER"]).optional(),
});

export type RouteResult = {
  ok: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  error?: string;
};

export const computeRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RouteInput.parse(input))
  .handler(async ({ data }): Promise<RouteResult> => {
    try {
      const res = await fetch(
        `${GATEWAY}/routes/directions/v2:computeRoutes`,
        {
          method: "POST",
          headers: {
            ...gatewayHeaders(),
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: data.originLat, longitude: data.originLng } } },
            destination: { location: { latLng: { latitude: data.destLat, longitude: data.destLng } } },
            travelMode: data.travelMode ?? "DRIVE",
            routingPreference: "TRAFFIC_UNAWARE",
          }),
        },
      );
      const body = (await res.json()) as {
        routes?: Array<{ distanceMeters?: number; duration?: string }>;
        error?: { message?: string };
      };
      if (!res.ok || !body.routes?.length) {
        return {
          ok: false,
          distanceMeters: null,
          durationSeconds: null,
          error: body.error?.message ?? `HTTP ${res.status}`,
        };
      }
      const r = body.routes[0];
      // duration comes as "1234s"
      const seconds = r.duration ? Number(r.duration.replace(/s$/, "")) : null;
      return {
        ok: true,
        distanceMeters: r.distanceMeters ?? null,
        durationSeconds: Number.isFinite(seconds) ? seconds : null,
      };
    } catch (err) {
      return {
        ok: false,
        distanceMeters: null,
        durationSeconds: null,
        error: err instanceof Error ? err.message : "Route computation failed",
      };
    }
  });