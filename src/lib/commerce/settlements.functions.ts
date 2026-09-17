/**
 * commerce/settlements.functions.ts
 *
 * Paso 7 del plan "Experiencias: la sección que vende en línea".
 *
 * Estado de cuenta por anfitrión (empresa) de las reservaciones PAGADAS:
 * importe vendido, comisión de la plataforma y neto a pagar al anfitrión,
 * separando lo cobrado en efectivo de lo cobrado con tarjeta.
 *
 * NO crea tablas ni folios nuevos: lee `concierge_orders` +
 * `concierge_order_items`, que ya guardan `commission_bps` y
 * `commission_amount` por partida (fuente única de verdad).
 *
 * Autorización: requireSupabaseAuth + has_role('super_admin' | 'admin').
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: unknown; userId: string }): Promise<void> {
  const client = context.supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  // El cliente debe conservar su `this`; llamarlo suelto rompe PostgREST.
  const rpc = (fn: string, args: Record<string, unknown>) => client.rpc(fn, args);
  const [a, b] = await Promise.all([
    rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (a.error) throw new Error(`role_check_failed: ${a.error.message}`);
  if (b.error) throw new Error(`role_check_failed: ${b.error.message}`);
  if (!a.data && !b.data) throw new Error("forbidden");
}

export interface HostSettlementOrderLine {
  order_id: string;
  folio: string;
  paid_at: string | null;
  source_kind: string;
  payment_method: "efectivo" | "tarjeta" | "otro";
  title: string;
  quantity: number;
  currency: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
}

export interface HostSettlementRow {
  business_id: string;
  business_name: string;
  currency: string;
  orders_count: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  cash_amount: number;
  card_amount: number;
  refunded_amount: number;
  lines: HostSettlementOrderLine[];
}

export interface HostSettlementsResult {
  from: string;
  to: string;
  currency: string;
  totals: {
    orders_count: number;
    gross_amount: number;
    commission_amount: number;
    net_amount: number;
    cash_amount: number;
    card_amount: number;
    refunded_amount: number;
  };
  rows: HostSettlementRow[];
}

const Input = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    businessId: z.string().uuid().optional(),
    /** all = venta directa + Arma tu Viaje */
    sourceKind: z.enum(["all", "direct_sale", "concierge_proposal"]).default("all"),
  })
  .default({ sourceKind: "all" });

function paymentMethod(provider: string | null): "efectivo" | "tarjeta" | "otro" {
  if (!provider) return "otro";
  const p = provider.toLowerCase();
  if (p.includes("cash") || p.includes("efectivo") || p === "manual") return "efectivo";
  if (p.includes("stripe") || p.includes("card") || p.includes("tarjeta")) return "tarjeta";
  return "otro";
}

export const getHostSettlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => Input.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<HostSettlementsResult> => {
    await assertAdmin(context);

    const to = data.to ?? new Date().toISOString();
    const from =
      data.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let query = context.supabase
      .from("concierge_orders")
      .select(
        `id, folio, paid_at, source_kind, status, currency, payment_provider,
         items:concierge_order_items!inner(
           title, quantity, currency, subtotal_amount, commission_amount,
           business_id, business:businesses(display_name, legal_name)
         )`,
      )
      .not("paid_at", "is", null)
      .gte("paid_at", from)
      .lte("paid_at", to)
      .order("paid_at", { ascending: false })
      .limit(1000);

    if (data.sourceKind !== "all") query = query.eq("source_kind", data.sourceKind);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const byBusiness = new Map<string, HostSettlementRow>();
    const seenOrders = new Map<string, Set<string>>();
    let currency = "MXN";

    for (const r of ((rows ?? []) as unknown as Array<Record<string, unknown>>)) {
      const orderId = r.id as string;
      const folio = r.folio as string;
      const paidAt = (r.paid_at as string | null) ?? null;
      const sourceKind = (r.source_kind as string) ?? "direct_sale";
      const isRefunded = ((r.status as string | null) ?? "") === "refunded";
      const method = paymentMethod((r.payment_provider as string | null) ?? null);
      currency = (r.currency as string) ?? currency;

      const items = (r.items as Array<Record<string, unknown>>) ?? [];
      for (const item of items) {
        const businessId = (item.business_id as string | null) ?? null;
        if (!businessId) continue;
        if (data.businessId && businessId !== data.businessId) continue;

        const biz = (item.business as Record<string, unknown> | null) ?? null;
        const gross = (item.subtotal_amount as number | null) ?? 0;
        const commission = (item.commission_amount as number | null) ?? 0;
        const net = Math.max(0, gross - commission);
        const itemCurrency = (item.currency as string | null) ?? currency;

        let row = byBusiness.get(businessId);
        if (!row) {
          row = {
            business_id: businessId,
            business_name: biz
              ? ((biz.display_name as string | null) ??
                (biz.legal_name as string | null) ??
                "Empresa sin nombre")
              : "Empresa sin nombre",
            currency: itemCurrency,
            orders_count: 0,
            gross_amount: 0,
            commission_amount: 0,
            net_amount: 0,
            cash_amount: 0,
            card_amount: 0,
            refunded_amount: 0,
            lines: [],
          };
          byBusiness.set(businessId, row);
          seenOrders.set(businessId, new Set());
        }

        // Lo reembolsado no se le liquida al anfitrión: se reporta aparte.
        if (isRefunded) {
          row.refunded_amount += gross;
          continue;
        }

        const seen = seenOrders.get(businessId)!;
        if (!seen.has(orderId)) {
          seen.add(orderId);
          row.orders_count += 1;
        }

        row.gross_amount += gross;
        row.commission_amount += commission;
        row.net_amount += net;
        if (method === "efectivo") row.cash_amount += gross;
        if (method === "tarjeta") row.card_amount += gross;

        row.lines.push({
          order_id: orderId,
          folio,
          paid_at: paidAt,
          source_kind: sourceKind,
          payment_method: method,
          title: (item.title as string | null) ?? "Partida",
          quantity: (item.quantity as number | null) ?? 1,
          currency: itemCurrency,
          gross_amount: gross,
          commission_amount: commission,
          net_amount: net,
        });
      }
    }

    const result: HostSettlementsResult = {
      from,
      to,
      currency,
      totals: {
        orders_count: 0,
        gross_amount: 0,
        commission_amount: 0,
        net_amount: 0,
        cash_amount: 0,
        card_amount: 0,
        refunded_amount: 0,
      },
      rows: [...byBusiness.values()].sort((a, b) => b.net_amount - a.net_amount),
    };

    for (const row of result.rows) {
      result.totals.orders_count += row.orders_count;
      result.totals.gross_amount += row.gross_amount;
      result.totals.commission_amount += row.commission_amount;
      result.totals.net_amount += row.net_amount;
      result.totals.cash_amount += row.cash_amount;
      result.totals.card_amount += row.card_amount;
      result.totals.refunded_amount += row.refunded_amount;
    }

    return result;
  });
