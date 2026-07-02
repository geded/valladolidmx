/**
 * 14.50.4 — UNC · Email Channel Adapter
 *
 * Server function interna que publica una entrega email idempotente en el
 * Delivery Ledger. La entrega real corre por la cola de Lovable Emails
 * (reintentos, supresión, DLQ); el ledger guarda la verdad funcional del
 * UNC y el `message_id` para correlación posterior.
 *
 * Soporta múltiples identidades de remitente vía `senderIdentity`
 * (reservas, notificaciones, marketing, alux) sin alterar el contrato del
 * Notification Center.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { assertUncPublisher } from "./_authz";

type Category = Database["public"]["Enums"]["notification_category"];

export const publishEmailNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      eventId: string;
      eventType: string;
      recipientUserId: string;
      audience: string;
      category: Category;
      templateKey: string;
      senderIdentity?: string | null;
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
        throw new Error("publishEmailNotification: parámetros incompletos");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertUncPublisher(context);
    const { data: row, error } = await context.supabase.rpc("unc_publish_email", {
      _event_id: data.eventId,
      _event_type: data.eventType,
      _recipient_user_id: data.recipientUserId,
      _audience: data.audience,
      _category: data.category,
      _template_key: data.templateKey,
      _sender_identity: data.senderIdentity ?? undefined,
      _payload_ref: (data.payloadRef ?? {}) as never,
    });
    if (error) throw error;
    return { delivery: row };
  });