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
import {
  STAY_MAX_NIGHTS,
  stayErrorMessage,
  type CalendarKind,
  type CalendarManageDay,
  type StayNight,
} from "@/lib/commerce/stay-calendar";

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
    return ((rows ?? []) as Array<{ night: string; available: number; price_cents: number | null }>).map((r) => ({
      night: String(r.night).slice(0, 10),
      available: Number(r.available) || 0,
      priceCents: r.price_cents === null || r.price_cents === undefined ? null : Number(r.price_cents),
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

/* ───────────── Calendario de precios y bloqueos (empresa y administrador) ───────────── */

export interface CalendarProduct {
  id: string;
  name: string;
  basePriceCents: number | null;
  kind: CalendarKind;
  /** Hoteles: habitaciones de ese tipo. */
  rooms: number;
}

const DATED_TYPES = ["hotel", "experiencia", "tour", "evento", "transporte", "servicio"] as const;

function toCalendarProduct(r: {
  id: string;
  name: string;
  product_type: string;
  direct_sale_price_amount: number | null;
  direct_sale_stock: number | null;
}): CalendarProduct {
  return {
    id: r.id,
    name: r.name,
    basePriceCents: r.direct_sale_price_amount ?? null,
    kind: r.product_type === "hotel" ? "noches" : "dias",
    rooms: r.direct_sale_stock ?? 1,
  };
}

async function assertEditor(context: { supabase: unknown; userId: string }, businessId: string) {
  const { data: allowed } = await (context.supabase as unknown as AnyRpc).rpc("has_business_access", {
    _user_id: context.userId,
    _business_id: businessId,
    _min_role: "editor",
  });
  if (allowed !== true) throw new Error(stayErrorMessage("forbidden"));
}

/** Productos con venta en línea por fecha de una empresa: habitaciones o experiencias. */
export const listCalendarProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ businessId: z.string().uuid(), kind: z.enum(["noches", "dias"]) }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<CalendarProduct[]> => {
    await assertEditor(context, data.businessId);
    const types = data.kind === "noches" ? ["hotel"] : DATED_TYPES.filter((t) => t !== "hotel");
    const { data: rows, error } = await context.supabase
      .from("products")
      .select("id, name, product_type, direct_sale_price_amount, direct_sale_stock, direct_sale_enabled")
      .eq("business_id", data.businessId)
      .in("product_type", types as Array<(typeof DATED_TYPES)[number]>)
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r) => r.direct_sale_enabled).map(toCalendarProduct);
  });

/** Un solo producto (ficha comercial de una experiencia en el CMS). */
export const getCalendarProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ productId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<CalendarProduct | null> => {
    const { data: row, error } = await context.supabase
      .from("products")
      .select("id, name, product_type, business_id, direct_sale_price_amount, direct_sale_stock")
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || !(DATED_TYPES as readonly string[]).includes(row.product_type)) return null;
    await assertEditor(context, row.business_id);
    return toCalendarProduct(row);
  });

export const getManageCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ productId: z.string().uuid(), from: DAY }).parse(raw))
  .handler(async ({ data, context }): Promise<CalendarManageDay[]> => {
    const { data: rows, error } = await (context.supabase as unknown as AnyRpc).rpc("commerce_day_calendar_manage", {
      _product_id: data.productId,
      _from: data.from,
      _days: 42,
    });
    if (error) throw new Error(stayErrorMessage(error.message));
    return (
      (rows ?? []) as Array<{
        day: string;
        price_cents: number | null;
        custom_price: boolean;
        blocked: boolean;
        business_closed: boolean;
        rooms: number;
        taken: number;
        departures: number;
        seats_left: number;
      }>
    ).map((r) => ({
      day: String(r.day).slice(0, 10),
      priceCents: r.price_cents === null ? null : Number(r.price_cents),
      customPrice: Boolean(r.custom_price),
      blocked: Boolean(r.blocked),
      businessClosed: Boolean(r.business_closed),
      rooms: Number(r.rooms) || 0,
      taken: Number(r.taken) || 0,
      departures: Number(r.departures) || 0,
      seatsLeft: Number(r.seats_left) || 0,
    }));
  });

export const setCalendarDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        days: z.array(DAY).min(1).max(400),
        action: z.enum(["price", "base_price", "block", "unblock"]),
        priceCents: z.number().int().positive().max(100_000_000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ changed: number }> => {
    const { data: n, error } = await (context.supabase as unknown as AnyRpc).rpc("commerce_day_calendar_set", {
      _product_id: data.productId,
      _days: data.days,
      _action: data.action,
      _price_cents: data.priceCents ?? null,
    });
    if (error) throw new Error(stayErrorMessage(error.message));
    return { changed: Number(n) || 0 };
  });

/** Hoteles: cuántas habitaciones iguales hay de ese tipo. */
export const setRoomCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ productId: z.string().uuid(), rooms: z.number().int().min(1).max(200) }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ rooms: number }> => {
    const { data: n, error } = await (context.supabase as unknown as AnyRpc).rpc("commerce_calendar_set_rooms", {
      _product_id: data.productId,
      _rooms: data.rooms,
    });
    if (error) throw new Error(stayErrorMessage(error.message));
    return { rooms: Number(n) || data.rooms };
  });

export { STAY_MAX_NIGHTS };
