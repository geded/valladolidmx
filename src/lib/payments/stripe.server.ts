/**
 * Stripe Payment Provider — Ola 4 · Etapa 5
 *
 * Implementación del contrato `PaymentProvider` para Stripe (Checkout
 * Sessions). Server-only; nunca debe ser importado por componentes ni
 * rutas de cliente.
 */
import Stripe from "stripe";
import type {
  CreateIntentInput,
  IntentResult,
  NormalizedEvent,
  PaymentProvider,
} from "./provider";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("stripe_secret_key_missing");
  }
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as Stripe.StripeConfig["apiVersion"] });
}

function toMinorUnits(amount: number, currency: string): number {
  // Stripe expects minor units; MXN/USD/EUR are 2-decimal. Zero-decimal
  // currencies (JPY, KRW…) would need adjustment.
  const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP"]);
  if (ZERO_DECIMAL.has(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async createIntent(input: CreateIntentInput): Promise<IntentResult> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        currency: input.currency.toLowerCase(),
        customer_email: input.customerEmail,
        client_reference_id: input.orderId,
        line_items: input.items.map((it) => ({
          quantity: it.quantity,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: toMinorUnits(it.unit_amount, input.currency),
            product_data: { name: it.name },
          },
        })),
        payment_intent_data: {
          description: input.description,
          metadata: input.metadata,
        },
        metadata: input.metadata,
        success_url: input.returnUrls.success,
        cancel_url: input.returnUrls.cancel,
      },
      {
        idempotencyKey: input.clientRequestId
          ? `co_${input.orderId}_${input.clientRequestId}`
          : `co_${input.orderId}`,
      },
    );

    return {
      provider: "stripe",
      providerIntentId: session.id,
      mode: "redirect",
      redirectUrl: session.url ?? undefined,
    };
  },

  async verifyWebhook(
    headers: Headers,
    rawBody: string,
  ): Promise<NormalizedEvent> {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("stripe_webhook_secret_missing");
    const sig = headers.get("stripe-signature");
    if (!sig) throw new Error("missing_signature");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      throw new Error(`invalid_signature: ${(err as Error).message}`);
    }

    const base = {
      provider: "stripe" as const,
      providerEventId: event.id,
      raw: event,
    };

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        return {
          ...base,
          type: "payment_succeeded",
          orderId:
            s.client_reference_id ??
            (s.metadata?.order_id as string | undefined) ??
            null,
          providerIntentId: s.id,
          reason: null,
        };
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        return {
          ...base,
          type: "payment_failed",
          orderId:
            s.client_reference_id ??
            (s.metadata?.order_id as string | undefined) ??
            null,
          providerIntentId: s.id,
          reason: event.type,
        };
      }
      case "charge.refunded": {
        const c = event.data.object as Stripe.Charge;
        return {
          ...base,
          type: "payment_refunded",
          orderId: (c.metadata?.order_id as string | undefined) ?? null,
          providerIntentId: (c.payment_intent as string | null) ?? null,
          reason: null,
        };
      }
      default:
        return {
          ...base,
          type: "ignored",
          orderId: null,
          providerIntentId: null,
          reason: event.type,
        };
    }
  },
};