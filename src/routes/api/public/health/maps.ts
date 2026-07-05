import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health/maps")({
  server: {
    handlers: {
      GET: async () => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        const gmKey = process.env.GOOGLE_MAPS_API_KEY;
        const browserKey = process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

        const result: Record<string, unknown> = {
          hasLovableApiKey: Boolean(lovableKey),
          hasServerKey: Boolean(gmKey),
          hasBrowserKey: Boolean(browserKey),
          browserKeyPreview: browserKey ? `${browserKey.slice(0, 6)}…${browserKey.slice(-4)}` : null,
        };

        if (!lovableKey || !gmKey) {
          return Response.json({ ok: false, ...result, error: "Missing keys" }, { status: 500 });
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

        return Response.json({ ...result, geocoding, staticMaps, routes });
      },
    },
  },
});