/**
 * portal/direct-sales-orders.functions.ts
 *
 * Portal Empresa · Mis ventas en línea (CV4.1 · lado proveedor).
 *
 * Lista las órdenes de venta directa que contienen productos de la
 * empresa activa. Filtros por fecha y estado; devuelve total bruto,
 * comisión de plataforma y neto a recibir por el proveedor.
 *
 * Autorización: requireSupabaseAuth + RPC `has_business_access`
 * (rol mínimo `viewer`). RLS refuerza en `concierge_order_items`
 * (business_reads_own_items) y `concierge_orders`
 * (business_reads_own_orders).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PortalDirectSaleOrderRow {
  order_id: string;
  folio: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  currency: string;
  quantity: number;
  product_title: string | null;
  item_subtotal: number;
  item_commission: number;
  item_net: number;
}

export interface PortalDirectSalesSummary {
  currency: string;
  orders_count: number;
  paid_count: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  refunded_amount: number;
}

const FilterInput = z.object({
  businessId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z
    .enum([
      "all",
      "paid",
      "fulfilled",
      "refunded",
      "cancelled",
      "awaiting_payment",
    ])
    .default("all"),
  limit: z.number().int().min(1).max(500).default(200),
});

async function assertBusinessAccess(
  context: { supabase: unknown; userId: string },
  businessId: string,
): Promise<void> {
  const rpc = (context.supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  }).rpc;
  const { data, error } = await rpc("has_business_access", {
    _user_id: context.userId,
    _business_id: businessId,
    _min_role: "viewer",
  });
  if (error) throw new Error(`access_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

export const listMyBusinessDirectSaleOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => FilterInput.parse(raw))
  .handler(async ({ data, context }): Promise<PortalDirectSaleOrderRow[]> => {
    await assertBusinessAccess(context, data.businessId);

    let query = context.supabase
      .from("concierge_order_items")
      .select(
        `id, title, quantity, subtotal_amount, commission_amount, business_id,
         order:concierge_orders!inner(
           id, folio, status, paid_at, created_at, currency, source_kind
         )`,
      )
      .eq("business_id", data.businessId)
      .eq("order.source_kind", "direct_sale")
      .order("created_at", { referencedTable: "concierge_orders", ascending: false })
      .limit(data.limit);

    if (data.status !== "all") {
      query = query.eq("order.status", data.status);
    }
    if (data.from) query = query.gte("order.created_at", data.from);
    if (data.to) query = query.lte("order.created_at", data.to);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const list: PortalDirectSaleOrderRow[] = [];
    for (const r of (rows ?? []) as Array<Record<string, unknown>>) {
      const order = r.order as Record<string, unknown> | null;
      if (!order) continue;
      const subtotal = (r.subtotal_amount as number) ?? 0;
      const commission = (r.commission_amount as number) ?? 0;
      list.push({
        order_id: order.id as string,
        folio: order.folio as string,
        status: order.status as string,
        paid_at: (order.paid_at as string | null) ?? null,
        created_at: order.created_at as string,
        currency: (order.currency as string) ?? "MXN",
        quantity: (r.quantity as number) ?? 1,
        product_title: (r.title as string | null) ?? null,
        item_subtotal: subtotal,
        item_commission: commission,
        item_net: Math.max(0, subtotal - commission),
      });
    }
    return list;
  });

export const getMyBusinessDirectSalesSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => FilterInput.parse(raw))
  .handler(async ({ data, context }): Promise<PortalDirectSalesSummary> => {
    await assertBusinessAccess(context, data.businessId);

    let query = context.supabase
      .from("concierge_order_items")
      .select(
        `subtotal_amount, commission_amount,
         order:concierge_orders!inner(status, currency, source_kind, created_at)`,
      )
      .eq("business_id", data.businessId)
      .eq("order.source_kind", "direct_sale")
      .limit(1000);

    if (data.from) query = query.gte("order.created_at", data.from);
    if (data.to) query = query.lte("order.created_at", data.to);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const summary: PortalDirectSalesSummary = {
      currency: "MXN",
      orders_count: 0,
      paid_count: 0,
      gross_amount: 0,
      commission_amount: 0,
      net_amount: 0,
      refunded_amount: 0,
    };

    for (const r of (rows ?? []) as Array<Record<string, unknown>>) {
      const order = r.order as Record<string, unknown> | null;
      if (!order) continue;
      const status = order.status as string;
      const subtotal = (r.subtotal_amount as number) ?? 0;
      const commission = (r.commission_amount as number) ?? 0;
      summary.currency = (order.currency as string) ?? summary.currency;
      summary.orders_count += 1;
      if (status === "paid" || status === "fulfilled") {
        summary.paid_count += 1;
        summary.gross_amount += subtotal;
        summary.commission_amount += commission;
        summary.net_amount += Math.max(0, subtotal - commission);
      } else if (status === "refunded") {
        summary.refunded_amount += subtotal;
      }
    }
    return summary;
  });