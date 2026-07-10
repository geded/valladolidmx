import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

/**
 * Diagnóstico de Google Maps. Endpoint sensible: gasta cuota del connector
 * y no debe filtrar presencia/preview de secretos. Requiere sesión admin
 * (Authorization: Bearer <supabase access token>) o el header
 * `x-cron-secret` con `EB_CRON_SECRET` para diagnósticos internos.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return timingSafeEqual(ab, bb);
}

async function authorize(request: Request): Promise<boolean> {
  const cronHeader = request.headers.get("x-cron-secret");
  const cronSecret = process.env.EB_CRON_SECRET ?? "";
  if (cronHeader && cronSecret && safeEqual(cronHeader, cronSecret)) return true;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!bearer) return false;
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
    if (userErr || !userData?.user) return false;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "super_admin",
    });
    return Boolean(isAdmin) || Boolean(isSuper);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/health/maps")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await authorize(request))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        const gmKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!lovableKey || !gmKey) {
          console.error("[health/maps] Missing server keys", {
            hasLovableApiKey: Boolean(lovableKey),
            hasServerKey: Boolean(gmKey),
          });
          return Response.json(
            { ok: false, error: "Missing keys" },
            { status: 500 },
          );
        }

        const gwHeaders = {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmKey,
        };

        // 1) Geocoding
        let geocoding: Record<string, unknown> = {};
        try {
          const r = await fetch(
            "https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=Valladolid,Yucatan",
            { headers: gwHeaders },
          );
          const body = await r.json();
          geocoding = { ok: r.ok && body?.status === "OK", httpStatus: r.status, status: body?.status, error: body?.error_message };
        } catch (err) {
          geocoding = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }

        // 2) Static Maps
        let staticMaps: Record<string, unknown> = {};
        try {
          const r = await fetch(
            "https://connector-gateway.lovable.dev/google_maps/maps/api/staticmap?center=20.68,-88.20&zoom=13&size=200x100",
            { headers: gwHeaders },
          );
          const contentType = r.headers.get("Content-Type") ?? "";
          const isImage = contentType.startsWith("image/");
          staticMaps = {
            ok: r.ok && isImage,
            httpStatus: r.status,
            contentType,
            error: !isImage ? (await r.text()).slice(0, 200) : null,
          };
        } catch (err) {
          staticMaps = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }

        // 3) Routes API v2
        let routes: Record<string, unknown> = {};
        try {
          const r = await fetch(
            "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
            {
              method: "POST",
              headers: {
                ...gwHeaders,
                "Content-Type": "application/json",
                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
              },
              body: JSON.stringify({
                origin: { location: { latLng: { latitude: 20.9674, longitude: -89.5926 } } },
                destination: { location: { latLng: { latitude: 20.68964, longitude: -88.20224 } } },
                travelMode: "DRIVE",
                routingPreference: "TRAFFIC_UNAWARE",
              }),
            },
          );
          const body = await r.json();
          routes = {
            ok: r.ok && Array.isArray(body?.routes) && body.routes.length > 0,
            httpStatus: r.status,
            distanceMeters: body?.routes?.[0]?.distanceMeters,
            duration: body?.routes?.[0]?.duration,
            error: body?.error?.message,
          };
        } catch (err) {
          routes = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }

        return Response.json({ ok: true, geocoding, staticMaps, routes });
      },
    },
  },
});