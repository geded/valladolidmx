/**
 * 14.50.5 — UNC · Webhook saliente (server-fn)
 *
 * CRUD básico de endpoints webhook del Empresario y publicador interno
 * hacia el Delivery Ledger. El envío HTTP firmado se ejecuta fuera de
 * este módulo; aquí se gestionan endpoints, rotación de secret y el
 * registro idempotente de entregas.
 *
 * - Sin uso de SUPABASE_SERVICE_ROLE_KEY.
 * - RLS aplicada vía requireSupabaseAuth (acceso como el usuario).
 * - Secret generado server-side; se devuelve UNA SOLA VEZ al crear o rotar.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { randomBytes } from "crypto";

type Category = Database["public"]["Enums"]["notification_category"];

function generateSecret(): string {
  return `whsec_${randomBytes(32).toString("hex")}`;
}

export const listWebhookEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notification_webhook_endpoints")
      .select("id, owner_user_id, business_id, label, url, is_active, created_at, updated_at")
      .eq("owner_user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { items: data ?? [] };
  });

export const createWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string; label?: string; businessId?: string }) => {
    if (!input?.url || !/^https:\/\//.test(input.url)) {
      throw new Error("createWebhookEndpoint: url https requerida");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const secret = generateSecret();
    const { data: row, error } = await context.supabase
      .from("notification_webhook_endpoints")
      .insert({
        owner_user_id: context.userId,
        business_id: data.businessId ?? null,
        label: data.label ?? null,
        url: data.url,
        secret_current: secret,
      })
      .select("id, url, label, is_active, created_at")
      .single();
    if (error) throw error;
    // secret devuelto sólo en este momento; nunca más se expone al cliente.
    return { endpoint: row, secret };
  });

export const rotateWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpointId: string }) => {
    if (!input?.endpointId) throw new Error("rotateWebhookSecret: endpointId requerido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: current, error: readError } = await context.supabase
      .from("notification_webhook_endpoints")
      .select("id, secret_current")
      .eq("id", data.endpointId)
      .eq("owner_user_id", context.userId)
      .single();
    if (readError) throw readError;

    const newSecret = generateSecret();
    const { error: writeError } = await context.supabase
      .from("notification_webhook_endpoints")
      .update({ secret_previous: current.secret_current, secret_current: newSecret })
      .eq("id", data.endpointId)
      .eq("owner_user_id", context.userId);
    if (writeError) throw writeError;
    return { secret: newSecret };
  });

export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpointId: string }) => {
    if (!input?.endpointId) throw new Error("deleteWebhookEndpoint: endpointId requerido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_webhook_endpoints")
      .delete()
      .eq("id", data.endpointId)
      .eq("owner_user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const publishWebhookNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      eventId: string;
      eventType: string;
      endpointId: string;
      audience: string;
      category: Category;
      templateKey: string;
      payloadRef?: Record<string, unknown>;
    }) => {
      if (
        !input?.eventId ||
        !input?.eventType ||
        !input?.endpointId ||
        !input?.audience ||
        !input?.category ||
        !input?.templateKey
      ) {
        throw new Error("publishWebhookNotification: parámetros incompletos");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("unc_publish_webhook", {
      _event_id: data.eventId,
      _event_type: data.eventType,
      _endpoint_id: data.endpointId,
      _audience: data.audience,
      _category: data.category,
      _template_key: data.templateKey,
      _payload_ref: (data.payloadRef ?? {}) as never,
    });
    if (error) throw error;
    return { delivery: row };
  });