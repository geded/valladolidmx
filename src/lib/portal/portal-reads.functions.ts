/**
 * portal/portal-reads.functions.ts — Lecturas autenticadas del Portal
 * Empresarial (Ola 3 · Etapa 1).
 *
 * Reglas (Plan 14.30):
 *  - Todas las funciones usan requireSupabaseAuth (RLS aplica como user).
 *  - El listado de empresas accesibles se filtra explícitamente por
 *    business_users.user_id = auth.uid() para evitar exponer IDs ajenos
 *    (mitigación RW3-7).
 *  - Verificación dura de pertenencia vía has_business_access se realiza
 *    en cada handler de escritura (Etapas posteriores).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PortalBusinessAccessRole = "viewer" | "editor" | "manager" | "owner";
export type PortalBusinessRole = PortalBusinessAccessRole | "admin";

export interface PortalBusinessSummary {
  business_id: string;
  slug: string;
  display_name: string;
  status: string;
  verified: boolean;
  role: PortalBusinessRole;
}

const ACCESS_ROLES: ReadonlySet<PortalBusinessAccessRole> = new Set([
  "viewer",
  "editor",
  "manager",
  "owner",
]);

function normalizeAccessRole(value: unknown): PortalBusinessAccessRole {
  return ACCESS_ROLES.has(value as PortalBusinessAccessRole)
    ? (value as PortalBusinessAccessRole)
    : "viewer";
}

/**
 * listMyBusinesses — Devuelve las empresas en las que el usuario actual
 * tiene una membresía activa (business_users.status = 'active').
 *
 * No usa SUPABASE_SERVICE_ROLE_KEY. RLS aplica como el usuario
 * autenticado. El filtro por user_id es defensivo (además de RLS).
 */
export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalBusinessSummary[]> => {
    const { supabase, userId } = context;

    const [superAdminRole, adminRole] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    if (superAdminRole.error) {
      throw new Error(`role_check_failed: ${superAdminRole.error.message}`);
    }
    if (adminRole.error) {
      throw new Error(`role_check_failed: ${adminRole.error.message}`);
    }

    if (superAdminRole.data || adminRole.data) {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, slug, display_name, status, verified, deleted_at")
        .is("deleted_at", null)
        .order("display_name", { ascending: true });
      if (error) throw new Error(`portal_admin_businesses_failed: ${error.message}`);
      return (data ?? []).map((b) => ({
        business_id: String(b.id),
        slug: String(b.slug),
        display_name: String(b.display_name),
        status: String(b.status),
        verified: Boolean(b.verified),
        role: "admin" as const,
      }));
    }

    const { data, error } = await supabase
      .from("business_users")
      .select(
        "role, status, business:businesses!inner(id, slug, display_name, status, verified, deleted_at)",
      )
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw new Error(`portal_list_failed: ${error.message}`);
    return (data ?? [])
      .map((row) => {
        const b = (row as { business: unknown }).business as {
          id: string;
          slug: string;
          display_name: string;
          status: string;
          verified: boolean | null;
          deleted_at: string | null;
        } | null;
        if (!b || b.deleted_at) return null;
        return {
          business_id: b.id,
          slug: String(b.slug),
          display_name: b.display_name,
          status: b.status,
          verified: Boolean(b.verified),
          role: (row as { role: PortalBusinessRole }).role,
        } satisfies PortalBusinessSummary;
      })
      .filter((x): x is PortalBusinessSummary => x !== null)
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "es"));
  });

/**
 * getMyBusinessAccess — Verifica server-side que el usuario actual tiene
 * acceso a una empresa con el rol mínimo solicitado. Útil como guarda
 * en loaders de detalle del Portal (Etapas posteriores).
 */
export const getMyBusinessAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { businessId: string; minRole?: PortalBusinessAccessRole }) => {
      if (!input || typeof input.businessId !== "string") {
        throw new Error("invalid_input");
      }
      const minRole = normalizeAccessRole(input.minRole ?? "viewer");
      return { businessId: input.businessId, minRole };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: allowed, error } = await supabase.rpc("has_business_access", {
      _user_id: userId,
      _business_id: data.businessId,
      _min_role: data.minRole,
    });
    if (error) throw new Error(`access_check_failed: ${error.message}`);
    return { allowed: Boolean(allowed) };
  });

export interface AdminBusinessCommercialStatus {
  business: {
    id: string;
    slug: string;
    display_name: string;
    status: string;
    verified: boolean;
    published_at: string | null;
  };
  configuration: {
    visibility_plan: string | null;
    products_total: number;
    products_published: number;
    accepts_online_payment: number;
    eligible_for_visibility_campaigns: number;
    visibility_levels: { standard: number; destacado: number; premium: number };
  };
  payments: {
    orders_total: number;
    paid_orders: number;
    processing_orders: number;
    failed_orders: number;
    unpaid_orders: number;
    paid_amount: number;
    currency: string;
  };
  visibility_packages: Array<{
    order_id: string;
    item_id: string;
    product_name: string;
    visibility_level: string | null;
    payment_status: string;
    paid_at: string | null;
    amount: number;
    currency: string;
  }>;
  orders: Array<{
    id: string;
    payment_status: string;
    payment_provider: string | null;
    paid_at: string | null;
    currency: string;
    total_amount: number;
    items_count: number;
  }>;
}

type VisibilityPackage = AdminBusinessCommercialStatus["visibility_packages"][number];

function assertBusinessIdForAdmin(input: unknown): string {
  const id = (input as { businessId?: unknown } | null)?.businessId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_business");
  return id;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readVisibilityPlan(metadata: Record<string, unknown>): string | null {
  const value =
    metadata.visibility_plan ??
    metadata.visibilityPlan ??
    metadata.plan_visibilidad ??
    metadata.visibility_package;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isVisibilityPackageName(name: string): boolean {
  return /visibilidad|destacad|premium|profesional|aliado|campaña|campana/i.test(
    name,
  );
}

export const getAdminBusinessCommercialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessIdForAdmin(input),
  }))
  .handler(async ({ data, context }): Promise<AdminBusinessCommercialStatus> => {
    const [superAdminRole, adminRole] = await Promise.all([
      context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "super_admin",
      }),
      context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      }),
    ]);
    if (superAdminRole.error) {
      throw new Error(`role_check_failed: ${superAdminRole.error.message}`);
    }
    if (adminRole.error) {
      throw new Error(`role_check_failed: ${adminRole.error.message}`);
    }
    if (!superAdminRole.data && !adminRole.data) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: businessRow, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, slug, display_name, status, verified, published_at, metadata, deleted_at",
      )
      .eq("id", data.businessId)
      .maybeSingle();
    if (businessError) throw new Error(`business_read_failed: ${businessError.message}`);
    if (!businessRow || businessRow.deleted_at) throw new Error("business_not_found");

    const { data: productRows, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, status, visibility_level, accepts_online_payment, eligible_for_ems_campaigns, deleted_at",
      )
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .limit(2000);
    if (productError) throw new Error(`products_read_failed: ${productError.message}`);

    const { data: itemRows, error: itemError } = await supabaseAdmin
      .from("order_items")
      .select(
        "id, order_id, product_id, quantity, unit_price, currency, snapshot_name",
      )
      .eq("business_id", data.businessId)
      .limit(2000);
    if (itemError) throw new Error(`order_items_read_failed: ${itemError.message}`);

    const items = (itemRows ?? []) as Array<{
      id: string;
      order_id: string;
      product_id: string | null;
      quantity: number | null;
      unit_price: number | null;
      currency: string | null;
      snapshot_name: string | null;
    }>;
    const orderIds = Array.from(new Set(items.map((i) => i.order_id))).filter(Boolean);
    const { data: orderRows, error: orderError } = orderIds.length
      ? await supabaseAdmin
          .from("orders")
          .select("id, payment_status, payment_provider, paid_at, currency, total_amount")
          .in("id", orderIds)
          .limit(2000)
      : { data: [], error: null };
    if (orderError) throw new Error(`orders_read_failed: ${orderError.message}`);

    const products = (productRows ?? []) as Array<{
      id: string;
      name: string;
      status: string;
      visibility_level: "standard" | "destacado" | "premium" | null;
      accepts_online_payment: boolean | null;
      eligible_for_ems_campaigns: boolean | null;
    }>;
    const productById = new Map(products.map((p) => [p.id, p]));
    const orders = (orderRows ?? []) as Array<{
      id: string;
      payment_status: string | null;
      payment_provider: string | null;
      paid_at: string | null;
      currency: string | null;
      total_amount: number | null;
    }>;
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const visibilityLevels = { standard: 0, destacado: 0, premium: 0 };
    for (const product of products) {
      const level = product.visibility_level ?? "standard";
      if (level in visibilityLevels) visibilityLevels[level] += 1;
    }

    const orderStatusSet = new Map<string, string>();
    for (const order of orders) {
      orderStatusSet.set(order.id, order.payment_status ?? "unpaid");
    }
    const uniqueStatuses = Array.from(orderStatusSet.values());
    const paidItems = items.filter(
      (item) => orderById.get(item.order_id)?.payment_status === "paid",
    );
    const paidAmount = paidItems.reduce(
      (sum, item) =>
        sum + Number(item.quantity ?? 0) * Number(item.unit_price ?? 0),
      0,
    );
    const currency =
      paidItems.find((item) => item.currency)?.currency ??
      orders.find((order) => order.currency)?.currency ??
      "MXN";

    const visibilityPackages: VisibilityPackage[] = [];
    for (const item of items) {
        const product = item.product_id ? productById.get(item.product_id) : undefined;
        const name = item.snapshot_name ?? product?.name ?? "Paquete";
        const level = product?.visibility_level ?? null;
        const looksLikeVisibilityPackage =
          level === "destacado" || level === "premium" || isVisibilityPackageName(name);
        if (!looksLikeVisibilityPackage) continue;
        const order = orderById.get(item.order_id);
        visibilityPackages.push({
          order_id: item.order_id,
          item_id: item.id,
          product_name: name,
          visibility_level: level,
          payment_status: order?.payment_status ?? "unpaid",
          paid_at: order?.paid_at ?? null,
          amount: Number(
            (Number(item.quantity ?? 0) * Number(item.unit_price ?? 0)).toFixed(2),
          ),
          currency: item.currency ?? currency,
        });
      }
    visibilityPackages.sort(
      (a, b) => Number(b.payment_status === "paid") - Number(a.payment_status === "paid"),
    );

    const itemCountByOrder = new Map<string, number>();
    for (const item of items) {
      itemCountByOrder.set(item.order_id, (itemCountByOrder.get(item.order_id) ?? 0) + 1);
    }
    const ordersDetailed = orders
      .map((o) => ({
        id: o.id,
        payment_status: o.payment_status ?? "unpaid",
        payment_provider: o.payment_provider ?? null,
        paid_at: o.paid_at,
        currency: o.currency ?? currency,
        total_amount: Number(o.total_amount ?? 0),
        items_count: itemCountByOrder.get(o.id) ?? 0,
      }))
      .sort((a, b) => {
        const ta = a.paid_at ? Date.parse(a.paid_at) : 0;
        const tb = b.paid_at ? Date.parse(b.paid_at) : 0;
        return tb - ta;
      });

    const metadata = metadataRecord(businessRow.metadata);
    return {
      business: {
        id: String(businessRow.id),
        slug: String(businessRow.slug),
        display_name: String(businessRow.display_name),
        status: String(businessRow.status),
        verified: Boolean(businessRow.verified),
        published_at: businessRow.published_at,
      },
      configuration: {
        visibility_plan: readVisibilityPlan(metadata),
        products_total: products.length,
        products_published: products.filter((p) => p.status === "published").length,
        accepts_online_payment: products.filter((p) => p.accepts_online_payment).length,
        eligible_for_visibility_campaigns: products.filter(
          (p) => p.eligible_for_ems_campaigns,
        ).length,
        visibility_levels: visibilityLevels,
      },
      payments: {
        orders_total: uniqueStatuses.length,
        paid_orders: uniqueStatuses.filter((s) => s === "paid").length,
        processing_orders: uniqueStatuses.filter((s) => s === "processing").length,
        failed_orders: uniqueStatuses.filter((s) => s === "failed").length,
        unpaid_orders: uniqueStatuses.filter((s) => !s || s === "unpaid").length,
        paid_amount: Number(paidAmount.toFixed(2)),
        currency,
      },
      visibility_packages: visibilityPackages.slice(0, 20),
      orders: ordersDetailed.slice(0, 50),
    };
  });