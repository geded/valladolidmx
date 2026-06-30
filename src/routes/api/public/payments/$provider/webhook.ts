/**
 * Webhook neutral de pagos — Ola 4 · Etapa 5.
 *
 * Punto de entrada para todos los proveedores configurados. Verifica la
 * firma vía la implementación de cada proveedor antes de cualquier
 * escritura. Idempotente por (provider, provider_event_id).
 *
 * Path: /api/public/payments/:provider/webhook
 */
import { createFileRoute } from "@tanstack/react-router";
import type { PaymentProviderId } from "@/lib/payments/provider";

const VALID: PaymentProviderId[] = ["stripe", "paddle", "mercadopago", "paypal"];

export const Route = createFileRoute("/api/public/payments/$provider/webhook")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const id = String(params.provider);
        if (!VALID.includes(id as PaymentProviderId)) {
          return new Response("Unknown provider", { status: 404 });
        }

        const rawBody = await request.text();

        const { getProvider } = await import("@/lib/payments/registry.server");
        let normalized;
        try {
          const provider = getProvider(id as PaymentProviderId);
          normalized = await provider.verifyWebhook(request.headers, rawBody);
        } catch (err) {
          console.error("[payments/webhook] verification failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { error: insertErr } = await supabaseAdmin
          .from("payment_events")
          .insert({
            provider: normalized.provider,
            provider_event_id: normalized.providerEventId,
            event_type: normalized.type,
            order_id: normalized.orderId,
            payload: JSON.parse(JSON.stringify(normalized.raw)),
          });
        if (insertErr) {
          if (insertErr.code === "23505") {
            return new Response("ok (duplicate)", { status: 200 });
          }
          console.error("[payments/webhook] insert failed", insertErr);
          return new Response("DB error", { status: 500 });
        }

        if (normalized.type === "payment_succeeded" && normalized.orderId) {
          const { error } = await supabaseAdmin.rpc("order_mark_paid", {
            p_order_id: normalized.orderId,
            p_provider: normalized.provider,
            p_intent_id: normalized.providerIntentId ?? "",
            p_event_id: normalized.providerEventId,
          });
          if (error) {
            console.error("[payments/webhook] order_mark_paid failed", error);
            return new Response("Processing error", { status: 500 });
          }
        } else if (normalized.type === "payment_failed" && normalized.orderId) {
          const { error } = await supabaseAdmin.rpc(
            "order_mark_payment_failed",
            {
              p_order_id: normalized.orderId,
              p_provider: normalized.provider,
              p_intent_id: normalized.providerIntentId ?? "",
              p_event_id: normalized.providerEventId,
              p_reason: normalized.reason ?? "",
            },
          );
          if (error) {
            console.error("[payments/webhook] mark_failed failed", error);
            return new Response("Processing error", { status: 500 });
          }
        }

        await supabaseAdmin
          .from("payment_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("provider", normalized.provider)
          .eq("provider_event_id", normalized.providerEventId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});