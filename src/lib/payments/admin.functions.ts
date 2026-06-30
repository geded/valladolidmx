/**
 * payments/admin.functions.ts — Ola 4 · Etapa 5
 *
 * Server fns para el panel administrativo de Pagos (CMS Studio).
 * Reportan el estado de configuración del proveedor activo SIN exponer
 * los valores de los secretos, y permiten listar los últimos eventos
 * recibidos por el webhook para auditoría rápida.
 *
 * Autorización dura: requireSupabaseAuth + has_role('super_admin' | 'admin').
 * Las keys NUNCA se devuelven al cliente, sólo flags booleanos.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: {
  supabase: ReturnType<typeof Object>;
  userId: string;
}): Promise<void> {
  const supabase = context.supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const [a, b] = await Promise.all([
    supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    }),
    supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (a.error) throw new Error(`role_check_failed: ${a.error.message}`);
  if (b.error) throw new Error(`role_check_failed: ${b.error.message}`);
  if (!a.data && !b.data) throw new Error("forbidden");
}

export interface PaymentProviderStatus {
  provider: string;
  secretsConfigured: {
    secretKey: boolean;
    webhookSecret: boolean;
  };
  webhookUrl: string;
  requiredEvents: string[];
  mode: "test" | "live" | "unknown";
  ready: boolean;
}

/**
 * getPaymentProviderStatus — Reporta el estado de configuración del
 * proveedor activo. Sólo devuelve flags booleanos, nunca los valores
 * de los secretos.
 */
export const getPaymentProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentProviderStatus> => {
    await assertAdmin(context);

    const providerId = (process.env.PAYMENTS_PROVIDER ?? "stripe").toLowerCase();

    const host = getRequestHost();
    const webhookUrl = `https://${host}/api/public/payments/${providerId}/webhook`;

    if (providerId === "stripe") {
      const sk = process.env.STRIPE_SECRET_KEY ?? "";
      const ws = process.env.STRIPE_WEBHOOK_SECRET ?? "";
      let mode: "test" | "live" | "unknown" = "unknown";
      if (sk.startsWith("sk_test_")) mode = "test";
      else if (sk.startsWith("sk_live_")) mode = "live";
      return {
        provider: "stripe",
        secretsConfigured: {
          secretKey: sk.length > 0,
          webhookSecret: ws.length > 0,
        },
        webhookUrl,
        requiredEvents: [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "checkout.session.async_payment_failed",
          "checkout.session.expired",
          "charge.refunded",
        ],
        mode,
        ready: sk.length > 0 && ws.length > 0,
      };
    }

    return {
      provider: providerId,
      secretsConfigured: { secretKey: false, webhookSecret: false },
      webhookUrl,
      requiredEvents: [],
      mode: "unknown",
      ready: false,
    };
  });

export interface AdminPaymentEvent {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  order_id: string | null;
  received_at: string;
  processed: boolean | null;
}

/**
 * listRecentPaymentEvents — Últimos eventos recibidos por el webhook
 * (sólo metadata: sin payloads completos para evitar exposición).
 */
export const listRecentPaymentEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPaymentEvent[]> => {
    await assertAdmin(context);
    const { supabase } = context;
    const { data, error } = await supabase
      .from("payment_events")
      .select(
        "id, provider, provider_event_id, event_type, order_id, received_at, processed",
      )
      .order("received_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(`payment_events_read_failed: ${error.message}`);
    return (data ?? []) as AdminPaymentEvent[];
  });

export interface AdminOrderPaymentSummary {
  totals: {
    paid: number;
    processing: number;
    failed: number;
    unpaid: number;
  };
  paidLast30dAmount: number;
  currency: string | null;
}

/**
 * getPaymentsSummary — Conteo de órdenes por estado de pago y monto
 * pagado en los últimos 30 días. Sólo lectura agregada.
 */
export const getPaymentsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrderPaymentSummary> => {
    await assertAdmin(context);
    const { supabase } = context;
    const { data, error } = await supabase
      .from("orders")
      .select("payment_status, total_amount, currency, paid_at")
      .limit(5000);
    if (error) throw new Error(`orders_read_failed: ${error.message}`);
    const rows = (data ?? []) as Array<{
      payment_status: string | null;
      total_amount: number | null;
      currency: string | null;
      paid_at: string | null;
    }>;
    const totals = { paid: 0, processing: 0, failed: 0, unpaid: 0 };
    let paidLast30dAmount = 0;
    let currency: string | null = null;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const r of rows) {
      const s = (r.payment_status ?? "unpaid") as keyof typeof totals;
      if (s in totals) totals[s] += 1;
      if (
        r.payment_status === "paid" &&
        r.paid_at &&
        new Date(r.paid_at).getTime() >= cutoff
      ) {
        paidLast30dAmount += Number(r.total_amount ?? 0);
        if (!currency) currency = r.currency;
      }
    }
    return { totals, paidLast30dAmount, currency };
  });