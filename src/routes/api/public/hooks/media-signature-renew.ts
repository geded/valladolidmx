/**
 * H3·A4 · M2.3.1 · Fase B · Endpoint interno HMAC.
 *
 * Ruta: POST `/api/public/hooks/media-signature-renew`
 * Autenticación: HMAC canónico exclusivo (regla Founder — no acepta
 * autenticación de usuario ni bearer como sustituto).
 *
 * Orden obligatorio (Founder §3):
 *   método → content-type → tamaño → timestamp → HMAC → consumir nonce → kill switch → lote.
 * Un HMAC inválido nunca alcanza la tabla de nonces.
 *
 * Respuestas: siempre sanitizadas. Nunca URL firmada, path, secreto ni error interno.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  RENEW_BODY_MAX_BYTES,
  verifyHmacRequest,
} from "@/lib/media/renewal-hmac.server";

const CANONICAL_PATH = "/api/public/hooks/media-signature-renew";
const HANDLER_DEADLINE_MS = 12_000;

function sanitized(status: number): Response {
  return new Response(JSON.stringify({ status }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/hooks/media-signature-renew")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const controller = new AbortController();
        const deadline = setTimeout(() => controller.abort(), HANDLER_DEADLINE_MS);
        try {
          const secret = process.env.MEDIA_SIGNATURE_RENEW_HMAC;
          if (!secret || secret.length < 32) return sanitized(401);

          // Tamaño primero por Content-Length; luego confirmamos tras leer el body.
          const cl = Number.parseInt(request.headers.get("content-length") ?? "", 10);
          if (Number.isFinite(cl) && cl > RENEW_BODY_MAX_BYTES) return sanitized(413);

          const body = await request.text();
          if (Buffer.byteLength(body, "utf8") > RENEW_BODY_MAX_BYTES) return sanitized(413);

          const check = verifyHmacRequest({
            method: request.method,
            path: CANONICAL_PATH,
            contentType: request.headers.get("content-type"),
            body,
            signatureHeader: request.headers.get("x-vmx-signature"),
            timestampHeader: request.headers.get("x-vmx-timestamp"),
            nonceHeader: request.headers.get("x-vmx-nonce"),
            secret,
          });
          if (!check.ok) {
            const s =
              check.reason === "method" ? 405 :
              check.reason === "content_type" ? 415 :
              check.reason === "body_too_large" ? 413 :
              401;
            return sanitized(s);
          }

          // A partir de aquí HMAC ya válido: consumimos nonce durable.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: nonceOk, error: nonceErr } = await supabaseAdmin.rpc("masr_consume_nonce", {
            _nonce: check.nonce,
            _ttl: "5 minutes",
            _used_by: "renew_endpoint",
          });
          if (nonceErr || nonceOk !== true) return sanitized(401);

          // Kill switch.
          const { isPersistedSignaturesEnabled } = await import("@/lib/media/persisted-flag.server");
          if (!(await isPersistedSignaturesEnabled())) {
            return json({ status: "disabled", claimed: 0, applied: 0, stale: 0, failed: 0 });
          }

          // Procesar lote.
          const { runRenewalBatch } = await import("@/lib/media/renewal-processor.server");
          const stats = await runRenewalBatch();
          return json({ status: "ok", ...stats });
        } catch {
          return sanitized(500);
        } finally {
          clearTimeout(deadline);
        }
      },
    },
  },
});