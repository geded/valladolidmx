/**
 * admin/direct-sales-commissions.functions.ts
 *
 * Panel administrativo · Ventas en línea (CV4.1 · lado ops).
 *
 * Reporta las órdenes con `source_kind='direct_sale'`, la comisión
 * devengada por proveedor y el neto a liquidar. Autorización:
 * requireSupabaseAuth + has_role('super_admin' | 'admin').
 *
 * Sin RPC nuevos: usa las políticas ops existentes de
 * concierge_orders / concierge_order_items.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: {
  supabase: { rpc: (fn: never, args: never) => unknown };
  userId: string;
}): Promise<void> {
  const rpc = (context.supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  }).rpc;
  const [a, b] = await Promise.all([
    rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (a.error) throw new Error(`role_check_failed: ${a.error.message}`);
  if (b.error) throw new Error(`role_check_failed: ${b.error.message}`);
  if (!a.data && !b.data) throw new Error("forbidden");
}

// ------------------------ tipos públicos ------------------------

export interface DirectSaleOrderRow {
  order_id: string;
  folio: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  currency: string;
  total_amount: number;
  commission_amount: number;
  traveler_name: string | null;
  business_id: string | null;
  business_name: string | null;
  product_title: string | null;
  quantity: number;
}

export interface DirectSaleBusinessRollup {
  business_id: string;
  business_name: string;
  orders_count: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  currency: string;
}

export interface DirectSalesSummary {
  total_orders: number;
  paid_orders: number;
  gross_amount: number;
  commission_amount: number;
  net_to_providers: number;
  refunded_amount: number;
  currency: string;
  by_business: DirectSaleBusinessRollup[];
}

// ------------------------ filtros ------------------------

const FilterInput = z
  .object({
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
    businessId: z.string().uuid().optional(),
    search: z.string().trim().max(120).optional(),
    limit: z.number().int().min(1).max(500).default(200),
  })
  .default({ status: "all", limit: 200 });

type FilterInputType = z.infer<typeof FilterInput>;

// ------------------------ list ------------------------

export const listDirectSaleOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => FilterInput.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<DirectSaleOrderRow[]> => {
    await assertAdmin(context);
    const filters = data as FilterInputType;

    let query = context.supabase
      .from("concierge_orders")
      .select(
        `id, folio, status, paid_at, created_at, currency, total_amount, commission_amount, traveler_name,
         items:concierge_order_items!inner(
           title, quantity, business_id, business:businesses(display_name, legal_name)
         )`,
      )
      .eq("source_kind", "direct_sale")
      .order("created_at", { ascending: false })
      .limit(filters.limit);

    if (filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.search) {
      query = query.or(
        `folio.ilike.%${filters.search}%,traveler_name.ilike.%${filters.search}%,traveler_email.ilike.%${filters.search}%`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const list: DirectSaleOrderRow[] = [];
    for (const r of (rows ?? []) as Array<Record<string, unknown>>) {
      const items = (r.items as Array<Record<string, unknown>>) ?? [];
      const first = items[0] ?? {};
      const biz = (first.business as Record<string, unknown> | null) ?? null;
      const businessId = (first.business_id as string | null) ?? null;
      if (filters.businessId && businessId !== filters.businessId) continue;
      list.push({
        order_id: r.id as string,
        folio: r.folio as string,
        status: r.status as string,
        paid_at: (r.paid_at as string | null) ?? null,
        created_at: r.created_at as string,
        currency: r.currency as string,
        total_amount: (r.total_amount as number) ?? 0,
        commission_amount: (r.commission_amount as number) ?? 0,
        traveler_name: (r.traveler_name as string | null) ?? null,
        business_id: businessId,
        business_name: biz
          ? ((biz.display_name as string | null) ??
            (biz.legal_name as string | null))
          : null,
        product_title: (first.title as string | null) ?? null,
        quantity: (first.quantity as number) ?? 1,
      });
    }
    return list;
  });

// ------------------------ summary ------------------------

export const getDirectSalesSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => FilterInput.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<DirectSalesSummary> => {
    await assertAdmin(context);
    const filters = data as FilterInputType;

    let query = context.supabase
      .from("concierge_orders")
      .select(
        `id, status, currency, total_amount, commission_amount,
         items:concierge_order_items!inner(
           business_id, business:businesses(display_name, legal_name)
         )`,
      )
      .eq("source_kind", "direct_sale")
      .limit(1000);

    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const summary: DirectSalesSummary = {
      total_orders: 0,
      paid_orders: 0,
      gross_amount: 0,
      commission_amount: 0,
      net_to_providers: 0,
      refunded_amount: 0,
      currency: "MXN",
      by_business: [],
    };

    const rollup = new Map<string, DirectSaleBusinessRollup>();

    for (const r of (rows ?? []) as Array<Record<string, unknown>>) {
      const status = r.status as string;
      const total = (r.total_amount as number) ?? 0;
      const commission = (r.commission_amount as number) ?? 0;
      const currency = (r.currency as string) ?? "MXN";
      const items = (r.items as Array<Record<string, unknown>>) ?? [];
      const first = items[0] ?? {};
      const businessId = (first.business_id as string | null) ?? null;
      const biz = (first.business as Record<string, unknown> | null) ?? null;
      if (filters.businessId && businessId !== filters.businessId) continue;

      summary.total_orders += 1;
      summary.currency = currency;

      if (status === "paid" || status === "fulfilled") {
        summary.paid_orders += 1;
        summary.gross_amount += total;
        summary.commission_amount += commission;
        summary.net_to_providers += Math.max(0, total - commission);
        if (businessId) {
          const name = biz
            ? ((biz.display_name as string | null) ??
              (biz.legal_name as string | null) ??
              "Sin nombre")
            : "Sin nombre";
          const key = businessId;
          const cur = rollup.get(key) ?? {
            business_id: key,
            business_name: name,
            orders_count: 0,
            gross_amount: 0,
            commission_amount: 0,
            net_amount: 0,
            currency,
          };
          cur.orders_count += 1;
          cur.gross_amount += total;
          cur.commission_amount += commission;
          cur.net_amount += Math.max(0, total - commission);
          rollup.set(key, cur);
        }
      } else if (status === "refunded") {
        summary.refunded_amount += total;
      }
    }

    summary.by_business = Array.from(rollup.values()).sort(
      (a, b) => b.gross_amount - a.gross_amount,
    );
    return summary;
  });