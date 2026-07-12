/**
 * orders.functions.ts — CV4.2 · Checkout narrativo del viajero
 *
 * Server fns que orquestan el ciclo de vida de `concierge_orders`:
 *   - createOrderFromProposal       (propuesta del concierge)
 *   - createDirectSaleOrder         (experiencia con venta directa)
 *   - getConciergeOrder             (detalle para la ruta /cuenta/checkout/$)
 *   - startConciergeOrderCheckout   (demo: confirma inmediato; real: TODO Stripe)
 *   - cancelConciergeOrder          (viajero cancela mientras no esté pagada)
 *
 * Toda la lógica sensible vive en RPCs SECURITY DEFINER + RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- tipos públicos ----------

export interface ConciergeOrderItemView {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_amount: number;
  currency: string;
  subtotal_amount: number;
  business_id: string | null;
  entity_kind: string;
  entity_id: string | null;
}

export interface ConciergeOrderView {
  id: string;
  folio: string;
  status: string;
  source_kind: "concierge_proposal" | "direct_sale";
  source_proposal_id: string | null;
  source_case_id: string | null;
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  editorial_title: string | null;
  editorial_summary: string | null;
  destination_name: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  items: ConciergeOrderItemView[];
}

// ---------- crear orden desde propuesta ----------

const ProposalInput = z.object({ proposalId: z.string().uuid() });

export const createOrderFromProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProposalInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc(
      "concierge_create_order_from_proposal",
      { _proposal_id: data.proposalId },
    );
    if (error) throw new Error(error.message);
    if (!orderId || typeof orderId !== "string") {
      throw new Error("order_creation_failed");
    }
    return { orderId };
  });

// ---------- crear orden de venta directa ----------

const DirectSaleInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50).default(1),
});

export const createDirectSaleOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => DirectSaleInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc(
      "concierge_create_direct_sale_order",
      { _product_id: data.productId, _quantity: data.quantity },
    );
    if (error) throw new Error(error.message);
    if (!orderId || typeof orderId !== "string") {
      throw new Error("order_creation_failed");
    }
    return { orderId };
  });

// ---------- leer orden ----------

const GetInput = z.object({ orderId: z.string().uuid() });

export const getConciergeOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GetInput.parse(data))
  .handler(async ({ data, context }): Promise<ConciergeOrderView> => {
    const { data: order, error } = await context.supabase
      .from("concierge_orders")
      .select(
        "id, folio, status, source_kind, source_proposal_id, source_case_id, currency, subtotal_amount, discount_amount, tax_amount, total_amount, editorial_title, editorial_summary, destination_name, paid_at, cancelled_at, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("order_not_found");

    const { data: items, error: iErr } = await context.supabase
      .from("concierge_order_items")
      .select(
        "id, title, description, quantity, unit_amount, currency, subtotal_amount, business_id, entity_kind, entity_id",
      )
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (iErr) throw new Error(iErr.message);

    return {
      ...(order as unknown as Omit<ConciergeOrderView, "items">),
      items: (items ?? []) as unknown as ConciergeOrderItemView[],
    };
  });

// ---------- iniciar checkout (demo o real) ----------

export interface StartCheckoutResult {
  mode: "demo" | "real";
  status: string;
  folio: string;
  redirectUrl?: string;
}

export const startConciergeOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GetInput.parse(data))
  .handler(async ({ data, context }): Promise<StartCheckoutResult> => {
    // Ownership check por RLS: sólo el dueño puede leer/actualizar
    const { data: order, error } = await context.supabase
      .from("concierge_orders")
      .select("id, folio, status, total_amount, currency, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("order_not_found");
    if (order.user_id !== context.userId) throw new Error("not_owner");
    if (order.status === "paid" || order.status === "fulfilled") {
      return { mode: "demo", status: order.status, folio: order.folio };
    }
    if (!["draft", "awaiting_payment"].includes(order.status)) {
      throw new Error(`order_not_payable:${order.status}`);
    }

    // ¿Modo demo?
    let demoMode = true;
    try {
      const { data: setting } = await context.supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "payments.demo_mode")
        .maybeSingle();
      if (setting && typeof setting.value === "boolean") {
        demoMode = setting.value;
      }
    } catch {
      // ignoramos, quedamos en demo por seguridad
    }

    if (demoMode) {
      const nowIso = new Date().toISOString();
      const { error: uErr } = await context.supabase
        .from("concierge_orders")
        .update({
          status: "paid",
          paid_at: nowIso,
          payment_provider: "demo",
          payment_provider_intent_id: `demo_${order.id.slice(0, 8)}`,
        })
        .eq("id", order.id);
      if (uErr) throw new Error(uErr.message);

      await context.supabase.from("concierge_order_events").insert({
        order_id: order.id,
        event_type: "paid_demo",
        actor_user_id: context.userId,
        payload: { amount: order.total_amount, currency: order.currency },
      });

      return { mode: "demo", status: "paid", folio: order.folio };
    }

    // Modo real: se conecta en la siguiente ola (Stripe intent con concierge_orders).
    throw new Error("real_provider_not_wired_yet");
  });

// ---------- cancelar ----------

const CancelInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
});

export const cancelConciergeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CancelInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("concierge_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: data.reason ?? null,
      })
      .eq("id", data.orderId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    await context.supabase.from("concierge_order_events").insert({
      order_id: data.orderId,
      event_type: "cancelled_by_traveler",
      actor_user_id: context.userId,
      payload: { reason: data.reason ?? null },
    });

    return { ok: true as const };
  });

// ---------- viaje confirmado del viajero (CV4.3-narrativa) ----------

export interface ConfirmedTravelSummary {
  order_id: string;
  folio: string;
  status: string; // "paid" | "fulfilled" | "refunded"
  paid_at: string | null;
  editorial_title: string | null;
  destination_name: string | null;
  total_amount: number;
  currency: string;
  travel_plan_id: string | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
  party_size: number | null;
  days_to_trip: number | null;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((target - todayUtc) / 86_400_000);
}

/**
 * Devuelve el viaje confirmado más reciente del viajero (si existe).
 * Alimenta el dock flotante, el modo "confirmado" de /cuenta/mi-viaje y
 * la memoria post-venta de Alux.
 */
export const getMyConfirmedTravel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfirmedTravelSummary | null> => {
    const { data: order, error } = await context.supabase
      .from("concierge_orders")
      .select(
        "id, folio, status, paid_at, editorial_title, destination_name, total_amount, currency, travel_plan_id",
      )
      .eq("user_id", context.userId)
      .in("status", ["paid", "fulfilled", "refunded"])
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error || !order) return null;

    let plan_start_date: string | null = null;
    let plan_end_date: string | null = null;
    let party_size: number | null = null;
    if (order.travel_plan_id) {
      const { data: plan } = await context.supabase
        .from("travel_plans")
        .select("start_date, end_date, party_size")
        .eq("id", order.travel_plan_id)
        .maybeSingle();
      if (plan) {
        plan_start_date = plan.start_date ?? null;
        plan_end_date = plan.end_date ?? null;
        party_size = plan.party_size ?? null;
      }
    }

    return {
      order_id: order.id,
      folio: order.folio,
      status: order.status,
      paid_at: order.paid_at,
      editorial_title: order.editorial_title,
      destination_name: order.destination_name,
      total_amount: order.total_amount,
      currency: order.currency,
      travel_plan_id: order.travel_plan_id,
      plan_start_date,
      plan_end_date,
      party_size,
      days_to_trip: daysUntil(plan_start_date),
    };
  });