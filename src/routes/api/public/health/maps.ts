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

        try {
          const started = Date.now();
          const r = await fetch(
            "https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=Valladolid,Yucatan",
            {
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "X-Connection-Api-Key": gmKey,
              },
            },
          );
          const latencyMs = Date.now() - started;
          const body = await r.json();
          return Response.json({
            ok: r.ok && body?.status === "OK",
            httpStatus: r.status,
            latencyMs,
            geocodeStatus: body?.status,
            geocodeError: body?.error_message ?? null,
            firstResult: body?.results?.[0]
              ? {
                  formatted: body.results[0].formatted_address,
                  location: body.results[0].geometry?.location,
                }
              : null,
            ...result,
          });
        } catch (err) {
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : String(err), ...result },
            { status: 500 },
          );
        }
      },
    },
  },
});