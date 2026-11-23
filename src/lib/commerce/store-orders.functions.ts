/**
 * Ventas en línea · fase 2 — pedidos desde la carta y productos de tienda.
 *
 *  - `startMenuOrder`: el viajero arma su pedido para recoger con la carta
 *    publicada (RPC `commerce_create_menu_order`, valida el interruptor).
 *  - `getProductSaleInfo`: lectura pública de piezas y precio para el botón.
 *  - `listStoreProducts` / `createStoreProducts` / `updateStoreProduct`:
 *    Administración da de alta y ajusta productos de tienda.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { onlineSaleModeFor } from "@/lib/commerce/online-sales-rules";
import { MENU_ORDER_MAX_LINES, MENU_ORDER_MAX_PER_ITEM } from "@/lib/commerce/store-catalog";

type AnyRpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function isAdmin(context: { supabase: unknown; userId: string }): Promise<boolean> {
  const client = context.supabase as unknown as AnyRpc;
  const results = await Promise.all(
    (["super_admin", "admin"] as const).map((role) => client.rpc("has_role", { _user_id: context.userId, _role: role })),
  );
  return results.some((r) => r.data === true);
}

export function storeOrderErrorMessage(message: string): string {
  if (message.includes("auth_required")) return "Inicia sesión para hacer tu pedido.";
  if (message.includes("insufficient_stock")) return "Ya no quedan piezas suficientes. Elige una cantidad menor.";
  if (message.includes("menu_item_unavailable")) return "Una bebida o platillo ya no está disponible. Revisa tu pedido.";
  if (message.includes("menu_item_without_price")) return "Uno de los productos no tiene precio publicado.";
  if (message.includes("menu_order_empty")) return "Agrega al menos un producto a tu pedido.";
  if (message.includes("online_sales_not_enabled_for_business"))
    return "Esta empresa no tiene la venta en línea activada para este tipo de producto.";
  if (message.includes("forbidden")) return "Solo el administrador puede hacer este cambio.";
  if (message.includes("store_product_price_required")) return "Cada producto necesita un precio mayor a cero.";
  if (message.includes("store_product_name_required")) return "Cada producto necesita un nombre.";
  return "No se pudo completar. Intenta de nuevo.";
}

/* ───────────────────────────── Pedido desde la carta ───────────────────────────── */

export const startMenuOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        items: z
          .array(
            z.object({
              menuItemId: z.string().uuid(),
              quantity: z.number().int().min(1).max(MENU_ORDER_MAX_PER_ITEM),
            }),
          )
          .min(1)
          .max(MENU_ORDER_MAX_LINES),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ orderId: string }> => {
    const { data: orderId, error } = await (context.supabase as unknown as AnyRpc).rpc(
      "commerce_create_menu_order",
      {
        _business_id: data.businessId,
        _items: data.items.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
        _channel: "pagina",
      },
    );
    if (error) throw new Error(storeOrderErrorMessage(error.message));
    return { orderId: String(orderId) };
  });

/* ───────────────────────────── Botón de compra (público) ───────────────────────────── */

export interface ProductSaleInfo {
  /** `tienda` / `pedidos` se compran por piezas, sin fecha. */
  mode: ReturnType<typeof onlineSaleModeFor>;
  stock: number | null;
  maxQuantity: number | null;
  priceCents: number | null;
  currency: string;
  /** Huéspedes por habitación (hoteles). */
  capacity: number | null;
}

export const getProductSaleInfo = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ productId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<ProductSaleInfo | null> => {
    const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: row } = await supabase
      .from("products")
      .select("product_type, direct_sale_stock, direct_sale_max_quantity, direct_sale_price_amount, direct_sale_currency, capacity")
      .eq("id", data.productId)
      .maybeSingle();
    if (!row) return null;
    return {
      mode: onlineSaleModeFor(row.product_type),
      stock: row.direct_sale_stock ?? null,
      maxQuantity: row.direct_sale_max_quantity ?? null,
      priceCents: row.direct_sale_price_amount ?? null,
      currency: row.direct_sale_currency ?? "MXN",
      capacity: row.capacity ?? null,
    };
  });

/* ───────────────────────────── Productos de tienda (admin) ───────────────────────────── */

export interface StoreProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  priceCents: number | null;
  stock: number | null;
  enabled: boolean;
}

export const listStoreProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ businessId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<StoreProductRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("products")
      .select("id, name, slug, status, direct_sale_price_amount, direct_sale_stock, direct_sale_enabled")
      .eq("business_id", data.businessId)
      .eq("product_type", "artesanal")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: String(r.slug),
      status: String(r.status),
      priceCents: r.direct_sale_price_amount ?? null,
      stock: r.direct_sale_stock ?? null,
      enabled: r.direct_sale_enabled === true,
    }));
  });

export const createStoreProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        items: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(200),
              price: z.number().positive().max(1_000_000),
              stock: z.number().int().min(0).max(100_000).nullable(),
              description: z.string().trim().max(2000).nullable(),
            }),
          )
          .min(1)
          .max(200),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ created: number }> => {
    if (!(await isAdmin(context))) throw new Error(storeOrderErrorMessage("forbidden"));
    const { data: n, error } = await (context.supabase as unknown as AnyRpc).rpc("admin_create_store_products", {
      _business_id: data.businessId,
      _items: data.items,
    });
    if (error) throw new Error(storeOrderErrorMessage(error.message));
    return { created: Number(n ?? 0) };
  });

export const updateStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        price: z.number().positive().max(1_000_000),
        stock: z.number().int().min(0).max(100_000).nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (!(await isAdmin(context))) throw new Error(storeOrderErrorMessage("forbidden"));
    const { error } = await context.supabase
      .from("products")
      .update({
        price_amount: data.price,
        direct_sale_price_amount: Math.round(data.price * 100),
        direct_sale_stock: data.stock,
      })
      .eq("id", data.productId)
      .eq("product_type", "artesanal");
    if (error) throw new Error(storeOrderErrorMessage(error.message));
    return { ok: true };
  });
