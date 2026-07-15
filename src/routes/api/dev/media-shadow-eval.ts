/**
 * H3·A4 · M2.1 · Endpoint interno del Shadow Evaluator.
 *
 * POST /api/dev/media-shadow-eval
 *   headers: x-vmx-shadow: <MEDIA_SHADOW_INTERNAL_SECRET>
 *   body:    { assetId: string, context?: string, targetWidth?: number }
 *
 * Reglas:
 *  - Responde 404 en producción (NODE_ENV === 'production').
 *  - Responde 404 si el host coincide con producción, aunque NODE_ENV mienta.
 *  - Responde 403 si el header no coincide con el secreto (comparación
 *    en tiempo constante dentro del evaluador).
 *  - Nunca devuelve URLs firmadas ni tokens ni datos personales:
 *    sólo la decisión, latencias y `fallback_reason`.
 *  - No modifica el render de ninguna superficie pública.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/dev/media-shadow-eval")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env.NODE_ENV === "production") {
          return new Response("Not Found", { status: 404 });
        }

        const hostHeader = (request.headers.get("host") ?? "").toLowerCase();
        const headerToken = request.headers.get("x-vmx-shadow");

        // Cortocircuito defensivo: rechazar producción por hostname.
        const PROD = new Set([
          "valladolidmx.lovable.app",
          "www.quehacerenvalladolid.com",
          "quehacerenvalladolid.com",
        ]);
        if (PROD.has(hostHeader)) {
          return new Response("Not Found", { status: 404 });
        }

        const body = (await request.json().catch(() => null)) as {
          assetId?: string;
          context?: string;
          targetWidth?: number;
        } | null;
        if (!body?.assetId) {
          return Response.json({ error: "assetId is required" }, { status: 400 });
        }

        // Import dinámico para mantener el módulo server-only fuera del bundle cliente.
        const { evaluateMediaSourceShadow } = await import(
          "@/lib/media/shadow-evaluator.server"
        );

        const decision = await evaluateMediaSourceShadow(
          { id: body.assetId, original_width: null, file_url: null } as never,
          {
            context: (body.context as never) ?? "generic",
            targetWidth: body.targetWidth,
          },
          { headerToken, host: hostHeader },
        );

        if (!decision.authorized) {
          return Response.json(
            { authorized: false, reason: decision.reason ?? "unauthorized" },
            { status: 403 },
          );
        }
        // Respuesta pública del endpoint: SIN URLs firmadas, SIN tokens.
        return Response.json({
          authorized: true,
          decision: decision.decision ?? null,
          variant_key: decision.variantKey ?? null,
          format_preferred: decision.formatPreferred ?? null,
          width_chosen: decision.widthChosen ?? null,
          fallback_reason: decision.fallbackReason ?? null,
          latency_ms: decision.latencyMs ?? null,
          signed_url_latency_ms: decision.signedUrlLatencyMs ?? null,
          signed_url_ok: decision.signedUrlOk ?? null,
        });
      },
    },
  },
});