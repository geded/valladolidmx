/**
 * 14.50.2 — UNC · Notification Router (in-app)
 *
 * Publica una entrega in-app idempotente. Pensado para ser invocado por
 * otros server-fn de negocio (orders, payments, webhooks). En Etapa 2 se
 * expone con `requireSupabaseAuth`: el cliente nunca debe llamarlo
 * directamente desde la UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Enums"]["notification_category"];

export const publishInAppNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      eventId: string;
      eventType: string;
      recipientUserId: string;
      audience: string;
      category: Category;
      payloadRef?: Record<string, unknown>;
    }) => {
      if (!input?.eventId || !input?.eventType || !input?.recipientUserId || !input?.audience || !input?.category) {
        throw new Error("publishInAppNotification: parámetros incompletos");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("unc_publish_in_app", {
      _event_id: data.eventId,
      _event_type: data.eventType,
      _recipient_user_id: data.recipientUserId,
      _audience: data.audience,
      _category: data.category,
      _payload_ref: (data.payloadRef ?? {}) as never,
    });
    if (error) throw error;
    return { delivery: row };
  });