/**
 * commerce/experiences-admin.functions.ts
 *
 * Paso 3 del plan "Experiencias: la sección que vende en línea".
 *
 * Vista comercial de Administración sobre los productos vendibles
 * (experiencia, tour, evento, transporte, servicio, artesanal).
 * NO duplica el editor editorial de `/cms/productos`: sólo lee y resume
 * el estado comercial (publicación, venta en línea, precio, comisión,
 * duración, cupo, ventas del periodo, solicitudes).
 *
 * Autorización: requireSupabaseAuth + rol admin / super_admin / editor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SELLABLE_PRODUCT_TYPES = [
  "experiencia",
  "tour",
  "evento",
  "transporte",
  "servicio",
  "artesanal",
] as const;

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
};

async function assertStaff(context: { supabase: unknown; userId: string }): Promise<void> {
  const rpc = (context.supabase as unknown as RpcClient).rpc;
  const roles = ["super_admin", "admin", "editor"] as const;
  const results = await Promise.all(
    roles.map((role) => rpc("has_role", { _user_id: context.userId, _role: role })),
  );
  for (const r of results) {
    if (r.error) throw new Error(`role_check_failed: ${r.error.message}`);
  }
  if (!results.some((r) => r.data)) throw new Error("forbidden");
}

export interface CommerceExperienceRow {
  id: string;
  slug: string;
  name: string;
  product_type: string;
  status: string;
  business_id: string;
  business_name: string | null;
  destination_id: string | null;
  conversion_mode: string;
  price_amount: number | null;
  price_currency: string;
  direct_sale_enabled: boolean;
  direct_sale_price_amount: number | null;
  direct_sale_currency: string;
  direct_sale_commission_bps: number | null;
  direct_sale_min_lead_hours: number | null;
  direct_sale_max_quantity: number | null;
  duration_minutes: number | null;
  capacity: number | null;
  requires_availability: boolean;
  updated_at: string;
  /** Avisos que impiden vender o que faltan por resolver. */
  warnings: string[];
  /** Reservaciones pagadas en el periodo consultado. */
  sold_orders: number;
  sold_amount: number;
}

type RawRow = Record<string, unknown>;

function buildWarnings(r: RawRow, business: RawRow | null): string[] {
  const out: string[] = [];
  const enabled = Boolean(r.direct_sale_enabled);
  const price = r.direct_sale_price_amount as number | null;
  const type = r.product_type as string;

  if (r.status !== "published") out.push("Ficha sin publicar");
  if (!business) out.push("Sin empresa asociada");
  else if (!business.destination_id) out.push("Empresa sin destino");

  if (enabled) {
    if (!price || price <= 0) out.push("Sin precio de venta");
    if (r.direct_sale_commission_bps == null) out.push("Sin comisión definida");
    if (!r.direct_sale_cancellation_policy) out.push("Sin política de cancelación");
    if (type !== "artesanal" && !r.duration_minutes) out.push("Sin duración");
    if (type !== "artesanal" && !r.capacity) out.push("Sin cupo por salida");
  }
  return out;
}

const ListInput = z
  .object({
    destinationId: z.string().uuid().nullable().optional(),
    businessId: z.string().uuid().nullable().optional(),
    productType: z.string().trim().max(40).nullable().optional(),
    status: z.string().trim().max(40).nullable().optional(),
    /** all = todos · sellable = con venta en línea · not_sellable = sin venta en línea */
    sellable: z.enum(["all", "sellable", "not_sellable"]).default("all"),
    search: z.string().trim().max(120).nullable().optional(),
    /** Ventana para contar ventas; por defecto los últimos 30 días. */
    salesFrom: z.string().datetime().nullable().optional(),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).default(0),
  })
  .default({ sellable: "all", limit: 50, offset: 0 });

export const listCommerceExperiences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => ListInput.parse(raw ?? {}))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      rows: CommerceExperienceRow[];
      total: number;
      limit: number;
      offset: number;
    }> => {
      await assertStaff(context);

      let query = context.supabase
        .from("products")
        .select(
          `id, slug, name, product_type, status, business_id, conversion_mode,
           price_amount, price_currency, duration_minutes, capacity, requires_availability,
           direct_sale_enabled, direct_sale_price_amount, direct_sale_currency,
           direct_sale_commission_bps, direct_sale_min_lead_hours, direct_sale_max_quantity,
           direct_sale_cancellation_policy, updated_at,
           business:businesses!inner(id, display_name, legal_name, destination_id)`,
          { count: "exact" },
        )
        .is("deleted_at", null)
        .in("product_type", [...SELLABLE_PRODUCT_TYPES])
        .order("updated_at", { ascending: false })
        .range(data.offset, data.offset + data.limit - 1);

      if (data.destinationId) {
        query = query.eq("businesses.destination_id", data.destinationId);
      }
      if (data.businessId) query = query.eq("business_id", data.businessId);
      if (data.productType)
        query = query.eq(
          "product_type",
          data.productType as (typeof SELLABLE_PRODUCT_TYPES)[number],
        );
      if (data.status)
        query = query.eq(
          "status",
          data.status as "draft" | "in_review" | "approved" | "published" | "archived",
        );
      if (data.sellable === "sellable") query = query.eq("direct_sale_enabled", true);
      if (data.sellable === "not_sellable") query = query.eq("direct_sale_enabled", false);
      if (data.search) query = query.ilike("name", `%${data.search}%`);

      const { data: rows, error, count } = await query;
      if (error) throw new Error(error.message);

      const raw = (rows ?? []) as unknown as RawRow[];
      const productIds = raw.map((r) => r.id as string);

      // Ventas pagadas del periodo por producto.
      const since =
        data.salesFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sales = new Map<string, { orders: number; amount: number }>();
      if (productIds.length > 0) {
        const { data: items } = await context.supabase
          .from("concierge_order_items")
          .select("entity_id, subtotal_amount, order:concierge_orders!inner(status, paid_at)")
          .eq("entity_kind", "product")
          .in("entity_id", productIds)
          .not("order.paid_at", "is", null)
          .gte("order.paid_at", since);

        for (const item of ((items ?? []) as unknown as RawRow[])) {
          const key = item.entity_id as string;
          const prev = sales.get(key) ?? { orders: 0, amount: 0 };
          sales.set(key, {
            orders: prev.orders + 1,
            amount: prev.amount + ((item.subtotal_amount as number | null) ?? 0),
          });
        }
      }

      const mapped: CommerceExperienceRow[] = raw.map((r) => {
        const business = (r.business as RawRow | null) ?? null;
        const s = sales.get(r.id as string);
        return {
          id: r.id as string,
          slug: r.slug as string,
          name: r.name as string,
          product_type: r.product_type as string,
          status: r.status as string,
          business_id: r.business_id as string,
          business_name: business
            ? ((business.display_name as string | null) ??
              (business.legal_name as string | null))
            : null,
          destination_id: business
            ? ((business.destination_id as string | null) ?? null)
            : null,
          conversion_mode: r.conversion_mode as string,
          price_amount: (r.price_amount as number | null) ?? null,
          price_currency: (r.price_currency as string) ?? "MXN",
          direct_sale_enabled: Boolean(r.direct_sale_enabled),
          direct_sale_price_amount: (r.direct_sale_price_amount as number | null) ?? null,
          direct_sale_currency: (r.direct_sale_currency as string | null) ?? "MXN",
          direct_sale_commission_bps: (r.direct_sale_commission_bps as number | null) ?? null,
          direct_sale_min_lead_hours: (r.direct_sale_min_lead_hours as number | null) ?? null,
          direct_sale_max_quantity: (r.direct_sale_max_quantity as number | null) ?? null,
          duration_minutes: (r.duration_minutes as number | null) ?? null,
          capacity: (r.capacity as number | null) ?? null,
          requires_availability: Boolean(r.requires_availability),
          updated_at: r.updated_at as string,
          warnings: buildWarnings(r, business),
          sold_orders: s?.orders ?? 0,
          sold_amount: s?.amount ?? 0,
        };
      });

      return {
        rows: mapped,
        total: count ?? mapped.length,
        limit: data.limit,
        offset: data.offset,
      };
    },
  );

// ------------------------ ficha ------------------------

export interface CommerceExperienceDetail extends CommerceExperienceRow {
  description: string | null;
  tagline: string | null;
  direct_sale_cancellation_policy: string | null;
  direct_sale_terms: string | null;
  accepts_online_payment: boolean;
  published_at: string | null;
  recent_orders: Array<{
    order_id: string;
    folio: string | null;
    status: string;
    paid_at: string | null;
    quantity: number;
    subtotal_amount: number;
    currency: string;
    scheduled_for: string | null;
  }>;
}

export const getCommerceExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ productId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<CommerceExperienceDetail> => {
    await assertStaff(context);

    const { data: row, error } = await context.supabase
      .from("products")
      .select(
        `id, slug, name, product_type, status, business_id, conversion_mode, description, tagline,
         price_amount, price_currency, duration_minutes, capacity, requires_availability,
         accepts_online_payment, published_at, updated_at,
         direct_sale_enabled, direct_sale_price_amount, direct_sale_currency,
         direct_sale_commission_bps, direct_sale_min_lead_hours, direct_sale_max_quantity,
         direct_sale_cancellation_policy, direct_sale_terms,
         business:businesses(id, display_name, legal_name, destination_id)`,
      )
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found");

    const r = row as unknown as RawRow;
    const business = (r.business as RawRow | null) ?? null;

    const { data: items } = await context.supabase
      .from("concierge_order_items")
      .select(
        `quantity, subtotal_amount, currency, scheduled_for,
         order:concierge_orders!inner(id, folio, status, paid_at)`,
      )
      .eq("entity_kind", "product")
      .eq("entity_id", data.productId)
      .order("created_at", { ascending: false })
      .limit(20);

    const recent = ((items ?? []) as unknown as RawRow[]).map((item) => {
      const order = (item.order as RawRow | null) ?? {};
      return {
        order_id: (order.id as string) ?? "",
        folio: (order.folio as string | null) ?? null,
        status: (order.status as string) ?? "—",
        paid_at: (order.paid_at as string | null) ?? null,
        quantity: (item.quantity as number) ?? 0,
        subtotal_amount: (item.subtotal_amount as number) ?? 0,
        currency: (item.currency as string) ?? "MXN",
        scheduled_for: (item.scheduled_for as string | null) ?? null,
      };
    });

    const paid = recent.filter((o) => o.paid_at);

    return {
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      product_type: r.product_type as string,
      status: r.status as string,
      business_id: r.business_id as string,
      business_name: business
        ? ((business.display_name as string | null) ?? (business.legal_name as string | null))
        : null,
      destination_id: business ? ((business.destination_id as string | null) ?? null) : null,
      conversion_mode: r.conversion_mode as string,
      price_amount: (r.price_amount as number | null) ?? null,
      price_currency: (r.price_currency as string) ?? "MXN",
      direct_sale_enabled: Boolean(r.direct_sale_enabled),
      direct_sale_price_amount: (r.direct_sale_price_amount as number | null) ?? null,
      direct_sale_currency: (r.direct_sale_currency as string | null) ?? "MXN",
      direct_sale_commission_bps: (r.direct_sale_commission_bps as number | null) ?? null,
      direct_sale_min_lead_hours: (r.direct_sale_min_lead_hours as number | null) ?? null,
      direct_sale_max_quantity: (r.direct_sale_max_quantity as number | null) ?? null,
      duration_minutes: (r.duration_minutes as number | null) ?? null,
      capacity: (r.capacity as number | null) ?? null,
      requires_availability: Boolean(r.requires_availability),
      updated_at: r.updated_at as string,
      warnings: buildWarnings(r, business),
      sold_orders: paid.length,
      sold_amount: paid.reduce((acc, o) => acc + o.subtotal_amount, 0),
      description: (r.description as string | null) ?? null,
      tagline: (r.tagline as string | null) ?? null,
      direct_sale_cancellation_policy:
        (r.direct_sale_cancellation_policy as string | null) ?? null,
      direct_sale_terms: (r.direct_sale_terms as string | null) ?? null,
      accepts_online_payment: Boolean(r.accepts_online_payment),
      published_at: (r.published_at as string | null) ?? null,
      recent_orders: recent,
    };
  });
