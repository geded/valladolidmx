/**
 * Registry de proveedores de pago — server-only.
 * Permite alternar proveedor por env (`PAYMENTS_PROVIDER`) sin que el
 * Marketplace conozca implementaciones concretas.
 */
import type { PaymentProvider, PaymentProviderId } from "./provider";
import { stripeProvider } from "./stripe.server";

const PROVIDERS: Record<PaymentProviderId, PaymentProvider | null> = {
  stripe: stripeProvider,
  paddle: null,
  mercadopago: null,
  paypal: null,
};

export function getActiveProviderId(): PaymentProviderId {
  const raw = (process.env.PAYMENTS_PROVIDER ?? "stripe").toLowerCase();
  if (raw === "stripe" || raw === "paddle" || raw === "mercadopago" || raw === "paypal") {
    return raw;
  }
  return "stripe";
}

export function getProvider(id: PaymentProviderId): PaymentProvider {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`payment_provider_not_configured: ${id}`);
  return p;
}

export function getActiveProvider(): PaymentProvider {
  return getProvider(getActiveProviderId());
}