/**
 * 14.50.5 — UNC · Push Channel Adapter (server-fn)
 *
 * Gestión de suscripciones Web Push del usuario y publicador interno hacia
 * el Delivery Ledger. La entrega real (envío VAPID) corre fuera de este
 * server-fn; aquí sólo se registra la suscripción y se publica en el
 * ledger conforme a preferencias y consentimiento.
 *
 * - Sin uso de SUPABASE_SERVICE_ROLE_KEY.
 * - RLS aplicada vía requireSupabaseAuth (acceso como el usuario).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Enums"]["notification_category"];

export const getVapidPublicKey = createServerFn({ method: "GET" })
  .handler(async () => ({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null }));

export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => {
      if (!input?.endpoint || !input?.p256dh || !input?.auth) {
        throw new Error("registerPushSubscription: parámetros incompletos");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("notification_push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "user_id,endpoint" },
      )
      .select()
      .single();
    if (error) throw error;
    return { subscription: row };
  });

export const revokePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => {
    if (!input?.endpoint) throw new Error("revokePushSubscription: endpoint requerido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_push_subscriptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw error;
    return { ok: true };
  });

export const publishPushNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      eventId: string;
      eventType: string;
      recipientUserId: string;
      audience: string;
      category: Category;
      templateKey: string;
      payloadRef?: Record<string, unknown>;
    }) => {
      if (
        !input?.eventId ||
        !input?.eventType ||
        !input?.recipientUserId ||
        !input?.audience ||
        !input?.category ||
        !input?.templateKey
      ) {
        throw new Error("publishPushNotification: parámetros incompletos");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("unc_publish_push", {
      _event_id: data.eventId,
      _event_type: data.eventType,
      _recipient_user_id: data.recipientUserId,
      _audience: data.audience,
      _category: data.category,
      _template_key: data.templateKey,
      _payload_ref: (data.payloadRef ?? {}) as never,
    });
    if (error) throw error;
    return { delivery: row };
  });