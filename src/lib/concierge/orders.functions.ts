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
  payment_provider: string | null;
  payment_provider_intent_id: string | null;
  traveler_name?: string | null;
  traveler_email?: string | null;
  traveler_phone?: string | null;
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
        "id, folio, status, source_kind, source_proposal_id, source_case_id, currency, subtotal_amount, discount_amount, tax_amount, total_amount, editorial_title, editorial_summary, destination_name, paid_at, payment_provider, payment_provider_intent_id, traveler_name, traveler_email, traveler_phone, cancelled_at, created_at",
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

    // Devuelve al cupo los lugares apartados de esta reservación.
    try {
      await context.supabase.rpc("commerce_order_holds_release", {
        _order_id: data.orderId,
        _reason: "reservación cancelada por el viajero",
      });
    } catch {
      // Los apartados vencen solos; no bloquea la cancelación.
    }

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
  /** Marcas de tiempo de los correos de la Etapa 8 (viaje).
   *  Se usan como señal de "hito nuevo sin leer" en el workspace del viajero. */
  email_t14_sent_at: string | null;
  email_t3_sent_at: string | null;
  email_welcome_sent_at: string | null;
  email_post_sent_at: string | null;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
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
        "id, folio, status, paid_at, editorial_title, destination_name, total_amount, currency, travel_plan_id, email_t14_sent_at, email_t3_sent_at, email_welcome_sent_at, email_post_sent_at",
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
      email_t14_sent_at: (order as any).email_t14_sent_at ?? null,
      email_t3_sent_at: (order as any).email_t3_sent_at ?? null,
      email_welcome_sent_at: (order as any).email_welcome_sent_at ?? null,
      email_post_sent_at: (order as any).email_post_sent_at ?? null,
    };
  });

// ---------- pago en efectivo (CV4.2 · modalidad única vigente) ----------

const CashInput = z.object({
  orderId: z.string().uuid(),
  note: z.string().max(300).optional().nullable(),
});

/**
 * Marca la reservación como pagada en efectivo.
 * Puede ejecutarla el viajero dueño de la reservación o el equipo interno
 * (concierge, coordinación, administración). La autorización real vive en
 * `concierge_order_mark_paid_cash` (SECURITY DEFINER).
 */
export const markConciergeOrderPaidCash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CashInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("concierge_order_mark_paid_cash", {
      _order_id: data.orderId,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    // Los lugares apartados quedan confirmados al registrarse el pago.
    try {
      await context.supabase.rpc("commerce_order_holds_confirm", { _order_id: data.orderId });
    } catch {
      // El pago ya quedó registrado; la confirmación de lugares se reintenta.
    }
    return res as { ok: boolean; status: string; folio: string; travel_plan_id: string | null };
  });

// ---------- central de reservaciones (sólo personal interno) ----------

export type ReservationPaymentFilter = "all" | "cash" | "online" | "unpaid";

export interface ConciergeReservationRow {
  id: string;
  folio: string;
  source_kind: "concierge_proposal" | "direct_sale";
  source_case_id: string | null;
  traveler_name: string | null;
  destination_name: string | null;
  editorial_title: string | null;
  status: string;
  payment_provider: string | null;
  payment_provider_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
  total_amount: number;
  currency: string;
  trip_start_date: string | null;
  trip_end_date: string | null;
}

export interface ConciergeReservationsResult {
  rows: ConciergeReservationRow[];
  total: number;
  totals: { cash: number; online: number; pending: number; reservations: number; currency: string };
}

export function reservationPaymentLabel(provider: string | null, paidAt: string | null) {
  if (!paidAt) return "Sin pago";
  if (provider === "cash") return "Efectivo";
  if (provider === "demo") return "Demostración";
  return "En línea";
}

const ReservationListInput = z.object({
  search: z.string().trim().max(120).default(""),
  status: z.string().max(30).default("all"),
  payment: z.enum(["all", "cash", "online", "unpaid"]).default("all"),
  source: z.enum(["all", "direct_sale", "concierge_proposal"]).default("all"),
  destination: z.string().trim().max(120).default(""),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(50),
});

async function assertOperationsRole(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((row: { role: string }) => ["admin", "super_admin", "concierge", "concierge_lead"].includes(row.role))) {
    throw new Error("forbidden_concierge_operations");
  }
}

export const listConciergeReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ReservationListInput.parse(data))
  .handler(async ({ data, context }): Promise<ConciergeReservationsResult> => {
    await assertOperationsRole(context.supabase, context.userId);
    let query = context.supabase
      .from("concierge_orders")
      .select("id, folio, source_kind, source_case_id, traveler_name, destination_name, editorial_title, status, payment_provider, payment_provider_intent_id, paid_at, created_at, total_amount, currency, travel_plan_id", { count: "exact" });
    if (data.search) {
      const term = data.search.replace(/[%,]/g, "");
      query = query.or(`folio.ilike.%${term}%,traveler_name.ilike.%${term}%,destination_name.ilike.%${term}%`);
    }
    if (data.status !== "all") query = query.eq("status", data.status);
    if (data.source !== "all") query = query.eq("source_kind", data.source);
    if (data.destination) query = query.ilike("destination_name", `%${data.destination.replace(/[%,]/g, "")}%`);
    if (data.fromDate) query = query.gte("created_at", `${data.fromDate}T00:00:00-06:00`);
    if (data.toDate) query = query.lte("created_at", `${data.toDate}T23:59:59-06:00`);
    if (data.payment === "cash") query = query.eq("payment_provider", "cash");
    if (data.payment === "online") query = query.not("payment_provider", "is", null).not("payment_provider", "in", "(cash,demo)");
    if (data.payment === "unpaid") query = query.is("paid_at", null);
    const from = (data.page - 1) * data.pageSize;
    const { data: orders, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);

    const planIds = (orders ?? []).map((o) => o.travel_plan_id).filter((id): id is string => Boolean(id));
    const { data: plans } = planIds.length
      ? await context.supabase.from("travel_plans").select("id, start_date, end_date").in("id", planIds)
      : { data: [] };
    const planById = new Map((plans ?? []).map((p) => [p.id, p]));

    // Totales de toda la selección; no sólo de la página visible.
    let totalsQuery = context.supabase.from("concierge_orders").select("status, payment_provider, total_amount, currency");
    if (data.status !== "all") totalsQuery = totalsQuery.eq("status", data.status);
    if (data.source !== "all") totalsQuery = totalsQuery.eq("source_kind", data.source);
    if (data.destination) totalsQuery = totalsQuery.ilike("destination_name", `%${data.destination.replace(/[%,]/g, "")}%`);
    if (data.fromDate) totalsQuery = totalsQuery.gte("created_at", `${data.fromDate}T00:00:00-06:00`);
    if (data.toDate) totalsQuery = totalsQuery.lte("created_at", `${data.toDate}T23:59:59-06:00`);
    if (data.payment === "cash") totalsQuery = totalsQuery.eq("payment_provider", "cash");
    if (data.payment === "online") totalsQuery = totalsQuery.not("payment_provider", "is", null).not("payment_provider", "in", "(cash,demo)");
    if (data.payment === "unpaid") totalsQuery = totalsQuery.is("paid_at", null);
    const { data: totalRows, error: totalsError } = await totalsQuery.limit(5000);
    if (totalsError) throw new Error(totalsError.message);
    const realRows = (totalRows ?? []).filter((row) => row.payment_provider !== "demo");
    const totals = realRows.reduce(
      (sum, row) => {
        const amount = Number(row.total_amount ?? 0);
        if (row.payment_provider === "cash" && ["paid", "fulfilled"].includes(row.status)) sum.cash += amount;
        else if (row.payment_provider && ["paid", "fulfilled"].includes(row.status)) sum.online += amount;
        else if (!["paid", "fulfilled", "cancelled", "refunded", "expired"].includes(row.status)) sum.pending += amount;
        return sum;
      },
      { cash: 0, online: 0, pending: 0, reservations: realRows.length, currency: "MXN" },
    );

    return {
      rows: (orders ?? []).map((order) => {
        const plan = order.travel_plan_id ? planById.get(order.travel_plan_id) : undefined;
        return { ...order, trip_start_date: plan?.start_date ?? null, trip_end_date: plan?.end_date ?? null } as ConciergeReservationRow;
      }),
      total: count ?? 0,
      totals,
    };
  });

export const getConciergeReservation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => ({ orderId: z.string().uuid().parse(data.orderId) }))
  .handler(async ({ data, context }) => {
    await assertOperationsRole(context.supabase, context.userId);
    const order = await getOrderForOperations(context.supabase, data.orderId);
    const [{ data: items, error: itemError }, { data: events, error: eventError }] = await Promise.all([
      context.supabase.from("concierge_order_items").select("id, title, description, quantity, unit_amount, currency, subtotal_amount, business_id, entity_kind, entity_id").eq("order_id", data.orderId).order("created_at"),
      context.supabase.from("concierge_order_events").select("id, event_type, actor_user_id, payload, created_at").eq("order_id", data.orderId).order("created_at", { ascending: false }),
    ]);
    if (itemError) throw new Error(itemError.message);
    if (eventError) throw new Error(eventError.message);
    const { data: booking } = await context.supabase.rpc("commerce_order_booking", { _order_id: data.orderId });
    return { order, items: items ?? [], events: events ?? [], booking: booking ?? [] };
  });

async function getOrderForOperations(supabase: any, orderId: string) {
  const { data, error } = await supabase.from("concierge_orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("reservation_not_found");
  return data;
}

export const getConciergeReservationForCase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { caseId: string }) => ({ caseId: z.string().uuid().parse(data.caseId) }))
  .handler(async ({ data, context }) => {
    await assertOperationsRole(context.supabase, context.userId);
    const { data: order, error } = await context.supabase.from("concierge_orders")
      .select("id, folio, status, total_amount, currency, payment_provider, paid_at")
      .eq("source_case_id", data.caseId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return order;
  });

export const startConciergeOnlinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; clientRequestId?: string }) => ({
    orderId: z.string().uuid().parse(data.orderId),
    clientRequestId: z.string().max(80).optional().parse(data.clientRequestId),
  }))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase.from("concierge_orders")
      .select("id, folio, user_id, status, total_amount, currency, traveler_email")
      .eq("id", data.orderId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== context.userId) throw new Error("reservation_not_found");
    if (!["draft", "awaiting_payment"].includes(order.status)) throw new Error("reservation_not_payable");
    const { data: items, error: itemsError } = await context.supabase.from("concierge_order_items")
      .select("title, quantity, unit_amount").eq("order_id", order.id);
    if (itemsError) throw new Error(itemsError.message);
    if (!(items ?? []).length) throw new Error("reservation_has_no_items");
    const { getActiveProvider } = await import("@/lib/payments/registry.server");
    const provider = getActiveProvider();
    const { getRequestHost } = await import("@tanstack/react-start/server");
    const base = `https://${getRequestHost()}`;
    const intent = await provider.createIntent({
      orderId: order.id, userId: context.userId, amount: order.total_amount / 100,
      currency: order.currency, description: `Reservación ${order.folio} — Valladolid.mx`,
      customerEmail: order.traveler_email ?? (context.claims?.email as string | undefined),
      items: (items ?? []).map((item) => ({ name: item.title, quantity: item.quantity, unit_amount: item.unit_amount / 100 })),
      metadata: { order_id: order.id, reservation_kind: "concierge_order", folio: order.folio },
      returnUrls: { success: `${base}/cuenta/pagos/exito?order=${order.id}`, cancel: `${base}/cuenta/pagos/error?order=${order.id}` },
      clientRequestId: data.clientRequestId ?? null,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: startError } = await supabaseAdmin.rpc("concierge_order_start_online_payment", {
      _order_id: order.id,
      _provider: provider.id,
      _intent_id: intent.providerIntentId,
    });
    if (startError) throw new Error(startError.message);
    return { mode: intent.mode, redirectUrl: intent.redirectUrl, clientSecret: intent.clientSecret };
  });
