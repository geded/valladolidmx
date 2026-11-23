/**
 * Ventas en línea · reservas por noche (hoteles) con confirmación del hotel.
 *
 *  - `getStayCalendar`: lectura pública de habitaciones libres por noche.
 *  - `requestStay`: el viajero solicita llegada/salida/huéspedes; se aparta
 *    12 h (RPC `commerce_request_stay`, valida el interruptor de la empresa).
 *  - `listStayRequests` / `decideStay`: el hotel confirma o rechaza.
 *
 * Reutiliza pedidos, comisión, pago y Portal de la venta en línea.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { STAY_MAX_NIGHTS, stayErrorMessage, type StayNight } from "@/lib/commerce/stay-calendar";

type AnyRpc = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getStayCalendar = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ productId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<StayNight[]> => {
    const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error } = await (supabase as unknown as AnyRpc).rpc("commerce_public_stay_calendar", {
      _product_id: data.productId,
      _days: 150,
    });
    if (error) throw new Error(stayErrorMessage(error.message));
    return ((rows ?? []) as Array<{ night: string; available: number }>).map((r) => ({
      night: String(r.night).slice(0, 10),
      available: Number(r.available) || 0,
    }));
  });

export const requestStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        checkIn: DAY,
        checkOut: DAY,
        guests: z.number().int().min(1).max(20),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ orderId: string }> => {
    const { data: orderId, error } = await (context.supabase as unknown as AnyRpc).rpc("commerce_request_stay", {
      _product_id: data.productId,
      _check_in: data.checkIn,
      _check_out: data.checkOut,
      _guests: data.guests,
      _channel: "pagina",
    });
    if (error) throw new Error(stayErrorMessage(error.message));
    return { orderId: String(orderId) };
  });

export interface StayRequestRow {
  orderId: string;
  folio: string;
  orderStatus: string;
  stayStatus: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalCents: number;
  travelerName: string | null;
  confirmBy: string | null;
  createdAt: string;
}

export const listStayRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ businessId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<StayRequestRow[]> => {
    const { data: allowed } = await (context.supabase as unknown as AnyRpc).rpc("has_business_access", {
      _user_id: context.userId,
      _business_id: data.businessId,
      _min_role: "viewer",
    });
    if (allowed !== true) throw new Error("forbidden");

    const { data: items, error } = await context.supabase
      .from("concierge_order_items")
      .select("order_id, title, quantity, subtotal_amount, metadata, created_at")
      .eq("business_id", data.businessId)
      .eq("entity_kind", "hotel_night")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const rows = (items ?? []) as Array<{
      order_id: string;
      title: string;
      quantity: number;
      subtotal_amount: number;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>;
    if (rows.length === 0) return [];

    const { data: orders, error: oErr } = await context.supabase
      .from("concierge_orders")
      .select("id, folio, status, traveler_name, metadata")
      .in("id", rows.map((r) => r.order_id));
    if (oErr) throw new Error(oErr.message);
    const byId = new Map(
      ((orders ?? []) as Array<{ id: string; folio: string; status: string; traveler_name: string | null; metadata: Record<string, unknown> | null }>).map(
        (o) => [o.id, o],
      ),
    );

    return rows.flatMap((r) => {
      const o = byId.get(r.order_id);
      if (!o) return [];
      const meta = o.metadata ?? {};
      return [
        {
          orderId: o.id,
          folio: o.folio,
          orderStatus: o.status,
          stayStatus: String(meta["stay_status"] ?? ""),
          roomName: r.title,
          checkIn: String(meta["check_in"] ?? ""),
          checkOut: String(meta["check_out"] ?? ""),
          nights: Number(meta["nights"] ?? r.quantity) || r.quantity,
          guests: Number(meta["guests"] ?? 1) || 1,
          totalCents: r.subtotal_amount,
          travelerName: o.traveler_name,
          confirmBy: (meta["confirm_by"] as string | undefined) ?? null,
          createdAt: r.created_at,
        },
      ];
    });
  });

export const decideStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ orderId: z.string().uuid(), accept: z.boolean(), note: z.string().max(500).optional() })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ result: string }> => {
    const { data: result, error } = await (context.supabase as unknown as AnyRpc).rpc("commerce_decide_stay", {
      _order_id: data.orderId,
      _accept: data.accept,
      _note: data.note ?? null,
    });
    if (error) throw new Error(stayErrorMessage(error.message));
    return { result: String(result) };
  });

export { STAY_MAX_NIGHTS };
