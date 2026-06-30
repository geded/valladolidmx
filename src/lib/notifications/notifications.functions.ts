/**
 * 14.50.1 — Unified Notification Center · Fundaciones
 *
 * Server functions mínimas para la Etapa 1: lectura propia del Delivery
 * Ledger y marcado como leído. Ningún canal está activo todavía; estas
 * funciones existen para que las etapas siguientes (Router + In-App)
 * puedan consumirlas sin reescribir contratos.
 *
 * - Sin uso de SUPABASE_SERVICE_ROLE_KEY.
 * - RLS aplicada vía requireSupabaseAuth (acceso como el usuario).
 * - RPCs SECURITY DEFINER con search_path fijo (ver migración).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyNotificationDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; onlyUnread?: boolean } | undefined) => ({
    limit: Math.min(Math.max(input?.limit ?? 50, 1), 200),
    onlyUnread: Boolean(input?.onlyUnread ?? false),
  }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_list_my_deliveries", {
      _limit: data.limit,
      _only_unread: data.onlyUnread,
    });
    if (error) throw error;
    return { items: rows ?? [] };
  });

export const countMyUnreadNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("unc_count_my_unread");
    if (error) throw error;
    return { unread: (data as number | null) ?? 0 };
  });

export const markNotificationDeliveryRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deliveryId: string }) => {
    if (!input?.deliveryId || typeof input.deliveryId !== "string") {
      throw new Error("deliveryId requerido");
    }
    return { deliveryId: input.deliveryId };
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("unc_mark_delivery_read", {
      _delivery_id: data.deliveryId,
    });
    if (error) throw error;
    return { delivery: row };
  });