/**
 * payments.functions.ts — Ola 4 · Etapa 5
 *
 * Server fns expuestas al cliente para iniciar el cobro de una orden
 * confirmada. Toda la integración con un proveedor concreto vive detrás
 * de la capa `PaymentProvider`; este módulo nunca importa SDKs de
 * proveedores.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(v: unknown, name: string): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) {
    throw new Error(`invalid_${name}`);
  }
  return v;
}
function clampRequestId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > 80) return null;
  return t;
}

export interface StartPaymentResult {
  provider: string;
  mode: "redirect" | "embedded";
  redirectUrl?: string;
  clientSecret?: string;
  providerIntentId: string;
  orderId: string;
  amount: number;
  currency: string;
}

/**
 * Inicia el cobro de una orden propia. Revalida server-side que la
 * orden, sus productos y precios sean elegibles para pago en línea.
 * Idempotente por `client_request_id`.
 */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { order_id?: string; client_request_id?: string }) => ({
      order_id: assertUuid(input?.order_id, "order_id"),
      client_request_id: clampRequestId(input?.client_request_id),
    }),
  )
  .handler(async ({ context, data }): Promise<StartPaymentResult> => {
    const { supabase, userId } = context;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, currency, total_amount, payment_status, payment_provider, payment_intent_id",
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr) throw new Error(`order_read_failed: ${oErr.message}`);
    if (!order || order.user_id !== userId) throw new Error("order_not_found");
    if (order.status !== "pending" && order.status !== "confirmed") {
      throw new Error("order_not_payable");
    }
    if (order.payment_status === "paid") {
      throw new Error("order_already_paid");
    }
    const amount = Number(order.total_amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("order_amount_invalid");
    }

    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select(
        "id, product_id, quantity, unit_price, currency, snapshot_name",
      )
      .eq("order_id", order.id);
    if (iErr) throw new Error(`order_items_read_failed: ${iErr.message}`);
    const rows = (items ?? []) as Array<{
      id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      currency: string;
      snapshot_name: string;
    }>;
    if (rows.length === 0) throw new Error("order_has_no_items");

    const productIds = Array.from(new Set(rows.map((r) => r.product_id)));
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select(
        "id, status, price_currency, price_amount, conversion_mode, accepts_online_payment",
      )
      .in("id", productIds);
    if (pErr) throw new Error(`products_read_failed: ${pErr.message}`);
    const byId = new Map(
      ((products ?? []) as unknown as Array<Record<string, unknown>>).map((p) => [
        String(p.id),
        p,
      ]),
    );
    for (const it of rows) {
      const p = byId.get(it.product_id);
      if (!p || p.status !== "published") {
        throw new Error("product_unavailable");
      }
      if (p.conversion_mode !== "reservar_en_linea") {
        throw new Error("product_not_reservable");
      }
      if (p.accepts_online_payment !== true) {
        throw new Error("product_payment_not_accepted");
      }
      const currentPrice = Number(p.price_amount ?? 0);
      if (Math.abs(currentPrice - Number(it.unit_price)) > 0.005) {
        throw new Error("price_changed");
      }
      if (String(p.price_currency) !== String(it.currency)) {
        throw new Error("currency_mismatch");
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const customerEmail =
      (profile?.email as string | undefined) ??
      (context.claims?.email as string | undefined);

    const { getActiveProvider } = await import("./registry.server");
    const provider = getActiveProvider();

    const host = getRequestHost();
    const base = `https://${host}`;
    const intent = await provider.createIntent({
      orderId: order.id,
      userId,
      amount,
      currency: order.currency,
      description: `Orden ${order.id.slice(0, 8)} — Valladolid.mx`,
      customerEmail,
      items: rows.map((it) => ({
        name: it.snapshot_name,
        quantity: it.quantity,
        unit_amount: Number(it.unit_price),
      })),
      metadata: {
        order_id: order.id,
        user_id: userId,
        provider: provider.id,
        client_request_id: data.client_request_id ?? "",
      },
      returnUrls: {
        success: `${base}/cuenta/pagos/exito?order=${order.id}`,
        cancel: `${base}/cuenta/pagos/error?order=${order.id}`,
      },
      clientRequestId: data.client_request_id,
    });

    const { error: uErr } = await supabase
      .from("orders")
      .update({
        payment_provider: provider.id,
        payment_intent_id: intent.providerIntentId,
        payment_status: "processing",
      })
      .eq("id", order.id);
    if (uErr) throw new Error(`order_update_failed: ${uErr.message}`);

    await supabase.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_initiated",
      payload: {
        provider: provider.id,
        intent_id: intent.providerIntentId,
        amount,
        currency: order.currency,
      },
    });

    return {
      provider: provider.id,
      mode: intent.mode,
      redirectUrl: intent.redirectUrl,
      clientSecret: intent.clientSecret,
      providerIntentId: intent.providerIntentId,
      orderId: order.id,
      amount,
      currency: order.currency,
    };
  });

/** Devuelve el id del proveedor activo (para que el UI elija flujo). */
export const getActivePaymentProvider = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ provider: string }> => {
    const { getActiveProviderId } = await import("./registry.server");
    return { provider: getActiveProviderId() };
  },
);