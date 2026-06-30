/**
 * marketplace/cart.functions.ts — Ola 4 · Etapa 4b
 * Carrito, Reservas y Órdenes.
 *
 * Reglas (Plan 14.40 §3 y §4 Etapa 4):
 *  - `requireSupabaseAuth` obligatorio en cada operación.
 *  - Mutaciones vía RPCs `SECURITY DEFINER` (`cart_*`, `order_*`)
 *    con `search_path = public` y EXECUTE TO `authenticated`.
 *  - Validación server-side (productos publicados, snapshot de precio,
 *    cantidades 1..99); el cliente nunca dicta precio ni usuario.
 *  - Idempotencia por `client_request_id` en add/confirm.
 *  - Auditoría completa en `order_events`.
 *  - Sin `SUPABASE_SERVICE_ROLE_KEY` en ningún flujo de usuario.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(v: unknown, name: string): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) {
    throw new Error(`invalid_${name}`);
  }
  return v;
}
function clampRequestId(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > 80) return null;
  return t;
}

export type OrderStatus =
  | "cart"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "fulfilled";

export interface CartItem {
  id: string;
  product_id: string;
  business_id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  snapshot_name: string;
  snapshot_slug: string;
  line_total: number;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotal_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  items: CartItem[];
}

function mapItem(row: Record<string, unknown>): CartItem {
  const qty = Number(row.quantity ?? 0);
  const unit = Number(row.unit_price ?? 0);
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    business_id: String(row.business_id),
    quantity: qty,
    unit_price: unit,
    currency: String(row.currency ?? "MXN"),
    snapshot_name: String(row.snapshot_name ?? ""),
    snapshot_slug: String(row.snapshot_slug ?? ""),
    line_total: Number((qty * unit).toFixed(2)),
  };
}

function mapOrder(
  row: Record<string, unknown>,
  items: Record<string, unknown>[],
): OrderSummary {
  return {
    id: String(row.id),
    status: row.status as OrderStatus,
    currency: String(row.currency ?? "MXN"),
    subtotal_amount: Number(row.subtotal_amount ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    confirmed_at: (row.confirmed_at as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    items: items.map(mapItem),
  };
}

const ORDER_COLS =
  "id, status, currency, subtotal_amount, total_amount, notes, created_at, updated_at, confirmed_at, cancelled_at";
const ITEM_COLS =
  "id, product_id, business_id, quantity, unit_price, currency, snapshot_name, snapshot_slug";

async function loadOrder(
  supabase: ReturnType<typeof getSb>,
  orderId: string,
  userId: string,
): Promise<OrderSummary | null> {
  const { data: order, error } = await supabase
    .from("orders")
    .select(ORDER_COLS)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`order_read_failed: ${error.message}`);
  if (!order) return null;
  const { data: items, error: iErr } = await supabase
    .from("order_items")
    .select(ITEM_COLS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (iErr) throw new Error(`order_items_read_failed: ${iErr.message}`);
  return mapOrder(
    order as Record<string, unknown>,
    (items ?? []) as Record<string, unknown>[],
  );
}

type Sb = NonNullable<unknown>;
function getSb(sb: Sb): Sb {
  return sb;
}

/** Lectura del carrito activo del viajero (puede ser null). */
export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderSummary | null> => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLS)
      .eq("user_id", context.userId)
      .eq("status", "cart")
      .maybeSingle();
    if (error) throw new Error(`cart_read_failed: ${error.message}`);
    if (!order) return null;
    return loadOrder(context.supabase, String(order.id), context.userId);
  });

/** Añade un producto al carrito (RPC idempotente). */
export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { product_id?: string; quantity?: number; client_request_id?: string }) => {
      const product_id = assertUuid(input?.product_id, "product_id");
      let q = typeof input?.quantity === "number" ? Math.floor(input.quantity) : 1;
      if (!Number.isFinite(q) || q < 1) q = 1;
      if (q > 99) q = 99;
      return {
        product_id,
        quantity: q,
        client_request_id: clampRequestId(input?.client_request_id),
      };
    },
  )
  .handler(async ({ context, data }): Promise<OrderSummary> => {
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { error } = await rpc("cart_add_item", {
      p_product_id: data.product_id,
      p_quantity: data.quantity,
      p_client_request_id: data.client_request_id,
    });
    if (error) throw new Error(`cart_add_failed: ${error.message}`);
    const cart = await (async () => {
      const { data: o, error: e } = await context.supabase
        .from("orders")
        .select(ORDER_COLS)
        .eq("user_id", context.userId)
        .eq("status", "cart")
        .maybeSingle();
      if (e) throw new Error(`cart_read_failed: ${e.message}`);
      if (!o) throw new Error("cart_missing_after_add");
      return loadOrder(context.supabase, String(o.id), context.userId);
    })();
    if (!cart) throw new Error("cart_missing_after_add");
    return cart;
  });

/** Actualiza la cantidad de un renglón del carrito. */
export const updateCartQty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { item_id?: string; quantity?: number }) => {
    const item_id = assertUuid(input?.item_id, "item_id");
    const q = Math.floor(Number(input?.quantity ?? 0));
    if (!Number.isFinite(q) || q < 1 || q > 99) throw new Error("invalid_quantity");
    return { item_id, quantity: q };
  })
  .handler(async ({ context, data }): Promise<OrderSummary | null> => {
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { error } = await rpc("cart_update_qty", {
      p_item_id: data.item_id,
      p_quantity: data.quantity,
    });
    if (error) throw new Error(`cart_qty_failed: ${error.message}`);
    const { data: o, error: e } = await context.supabase
      .from("orders")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "cart")
      .maybeSingle();
    if (e) throw new Error(`cart_read_failed: ${e.message}`);
    if (!o) return null;
    return loadOrder(context.supabase, String(o.id), context.userId);
  });

/** Elimina un renglón del carrito. */
export const removeFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { item_id?: string }) => ({
    item_id: assertUuid(input?.item_id, "item_id"),
  }))
  .handler(async ({ context, data }): Promise<OrderSummary | null> => {
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { error } = await rpc("cart_remove_item", { p_item_id: data.item_id });
    if (error) throw new Error(`cart_remove_failed: ${error.message}`);
    const { data: o, error: e } = await context.supabase
      .from("orders")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "cart")
      .maybeSingle();
    if (e) throw new Error(`cart_read_failed: ${e.message}`);
    if (!o) return null;
    return loadOrder(context.supabase, String(o.id), context.userId);
  });

/** Confirma el carrito (cart → pending). Idempotente por client_request_id. */
export const confirmOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { client_request_id?: string; notes?: string }) => ({
    client_request_id: clampRequestId(input?.client_request_id),
    notes:
      typeof input?.notes === "string" && input.notes.trim().length > 0
        ? input.notes.trim().slice(0, 1000)
        : null,
  }))
  .handler(async ({ context, data }): Promise<OrderSummary> => {
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data: orderId, error } = await rpc("order_confirm", {
      p_client_request_id: data.client_request_id,
      p_notes: data.notes,
    });
    if (error) throw new Error(`order_confirm_failed: ${error.message}`);
    const id = typeof orderId === "string" ? orderId : String(orderId ?? "");
    if (!id) throw new Error("order_confirm_returned_no_id");
    const order = await loadOrder(context.supabase, id, context.userId);
    if (!order) throw new Error("order_not_found_after_confirm");
    return order;
  });

/** Cancela una orden propia (cart/pending/confirmed). */
export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { order_id?: string }) => ({
    order_id: assertUuid(input?.order_id, "order_id"),
  }))
  .handler(async ({ context, data }): Promise<OrderSummary | null> => {
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { error } = await rpc("order_cancel", { p_order_id: data.order_id });
    if (error) throw new Error(`order_cancel_failed: ${error.message}`);
    return loadOrder(context.supabase, data.order_id, context.userId);
  });

/** Lista del historial de órdenes del viajero (excluye carrito activo). */
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderSummary[]> => {
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLS)
      .eq("user_id", context.userId)
      .neq("status", "cart")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(`orders_read_failed: ${error.message}`);
    const rows = (orders ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return [];
    const ids = rows.map((r) => String(r.id));
    const { data: items, error: iErr } = await context.supabase
      .from("order_items")
      .select("order_id, " + ITEM_COLS)
      .in("order_id", ids);
    if (iErr) throw new Error(`orders_items_read_failed: ${iErr.message}`);
    const byOrder = new Map<string, Record<string, unknown>[]>();
    for (const it of (items ?? []) as Record<string, unknown>[]) {
      const oid = String(it.order_id);
      if (!byOrder.has(oid)) byOrder.set(oid, []);
      byOrder.get(oid)!.push(it);
    }
    return rows.map((r) => mapOrder(r, byOrder.get(String(r.id)) ?? []));
  });