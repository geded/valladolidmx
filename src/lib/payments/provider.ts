/**
 * Payment Provider Abstraction — Ola 4 · Etapa 5
 *
 * Contrato neutral que aísla al Marketplace de cualquier proveedor de
 * pagos concreto. Stripe es la primera implementación; futuros
 * proveedores (Paddle, Mercado Pago, PayPal) implementarán la misma
 * interfaz sin tocar carrito, órdenes ni UI.
 *
 * Ningún componente de UI ni el dominio del Marketplace debe importar
 * SDKs específicos de proveedor — únicamente este módulo.
 */

export type PaymentProviderId =
  | "stripe"
  | "paddle"
  | "mercadopago"
  | "paypal";

export interface CreateIntentInput {
  /** ID de la orden ya validada server-side. */
  orderId: string;
  /** ID del viajero (auth.uid()). */
  userId: string;
  /** Importe en la moneda de la orden. */
  amount: number;
  /** ISO 4217 (ej. "MXN"). */
  currency: string;
  /** Descripción amigable para el comprador. */
  description: string;
  /** Email del comprador (para recibos del proveedor). */
  customerEmail?: string;
  /** Línea(s) de la orden, ya con snapshot de precio. */
  items: Array<{
    name: string;
    quantity: number;
    unit_amount: number;
  }>;
  /** Metadata cruzada orden/proveedor. */
  metadata: Record<string, string>;
  /** URLs de retorno tras checkout (success / cancel). */
  returnUrls: { success: string; cancel: string };
  /** Idempotencia del cliente. */
  clientRequestId: string | null;
}

export interface IntentResult {
  provider: PaymentProviderId;
  /** ID del intent/checkout/orden remoto. */
  providerIntentId: string;
  /**
   * Modo de checkout. `redirect` envía a `redirectUrl`; `embedded`
   * entrega `clientSecret` para montar Elements en cliente.
   */
  mode: "redirect" | "embedded";
  redirectUrl?: string;
  clientSecret?: string;
}

export type NormalizedEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "payment_refunded"
  | "ignored";

export interface NormalizedEvent {
  provider: PaymentProviderId;
  providerEventId: string;
  type: NormalizedEventType;
  /** orderId leído desde metadata del proveedor. */
  orderId: string | null;
  providerIntentId: string | null;
  reason: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  createIntent(input: CreateIntentInput): Promise<IntentResult>;
  verifyWebhook(
    headers: Headers,
    rawBody: string,
  ): Promise<NormalizedEvent>;
}