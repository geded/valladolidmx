/**
 * commerce/booking.functions.ts
 *
 * Paso 5 del plan "Experiencias: la sección que vende en línea".
 * Reservación en línea con pago en efectivo (la tarjeta queda instalada
 * pero apagada, según la configuración central de /cms/configuracion).
 *
 * No crea un motor nuevo: reutiliza el inventario `commerce_*` (paso 4)
 * y las reservaciones `concierge_orders` (folio ERL) ya existentes.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export interface PublicDeparture {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  available: number;
}

export interface OrderBookingRow {
  hold_id: string;
  status: string;
  quantity: number;
  expires_at: string;
  departure_id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  product_name: string;
}

type AnyClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Salidas con lugares disponibles de una experiencia publicada (lectura pública). */
export const listAvailableDepartures = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PublicDeparture[]> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await (supabase as unknown as AnyClient).rpc(
      "commerce_public_departures",
      {
        _product_id: data.productId,
        _from: data.from ?? null,
        _to: data.to ?? null,
      },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as PublicDeparture[];
  });

/** Aparta los lugares y crea la reservación del viajero (folio ERL). */
export const startBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        departureId: z.string().uuid().nullable().optional(),
        quantity: z.number().int().min(1).max(50).default(1),
        clientRequestId: z.string().min(8).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as unknown as AnyClient).rpc(
      "commerce_booking_start",
      {
        _product_id: data.productId,
        _departure_id: data.departureId ?? null,
        _quantity: data.quantity,
        _idempotency_key: data.clientRequestId,
      },
    );
    if (error) throw new Error(translateBookingError(error.message));
    return res as { order_id: string; hold_id: string | null; expires_at: string | null };
  });

/** Salida apartada para una reservación (viajero dueño o equipo interno). */
export const getOrderBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<OrderBookingRow[]> => {
    const { data: rows, error } = await (context.supabase as unknown as AnyClient).rpc(
      "commerce_order_booking",
      { _order_id: data.orderId },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as OrderBookingRow[];
  });

export function translateBookingError(message: string): string {
  if (message.includes("insufficient_capacity")) {
    return "Ya no quedan lugares suficientes en ese horario. Elige otra fecha u hora.";
  }
  if (message.includes("departure_required")) {
    return "Elige la fecha y hora de tu experiencia.";
  }
  if (message.includes("departure_not_open") || message.includes("departure_past")) {
    return "Ese horario ya no está disponible.";
  }
  if (message.includes("departure_blacked_out")) {
    return "Ese día la experiencia no opera.";
  }
  if (message.includes("quantity_above_platform_max")) {
    return "Esa cantidad de personas supera el máximo permitido por reservación.";
  }
  if (message.includes("auth_required")) {
    return "Inicia sesión para reservar.";
  }
  return message;
}
