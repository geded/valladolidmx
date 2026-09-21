/**
 * push-dispatch.server.ts — UNC · Entrega real del canal Push (Web Push / VAPID).
 *
 * Delta mínimo y aditivo sobre la infraestructura UNC existente:
 *  - No crea tablas, estados ni canales nuevos: consume `notification_deliveries`
 *    (channel = 'push', status = 'pending') y `notification_push_subscriptions`.
 *  - No modifica el flujo editorial ni el canal in-app.
 *  - Fail-closed: sin llaves VAPID configuradas no envía nada y deja la entrega
 *    en `pending` para un intento posterior.
 *
 * Runtime: Worker/edge. Usa WebCrypto (`@block65/webcrypto-web-push`), nunca
 * dependencias nativas de Node.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { uncEventTitle } from "./event-titles";

type DeliveryRow = {
  id: string;
  event_type: string;
  recipient_user_id: string;
  attempt_count: number;
  payload_ref: Record<string, unknown> | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export interface PushDispatchResult {
  candidates: number;
  sent: number;
  failed: number;
  skipped: number;
}

const MAX_ATTEMPTS = 3;

function readString(source: Record<string, unknown> | null, key: string): string | null {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function bodyFor(row: DeliveryRow): string {
  return readString(row.payload_ref, "alt_text") ?? "Abre para revisar el detalle.";
}

function urlFor(row: DeliveryRow): string {
  if (row.event_type === "media.review_requested") return "/cms/media?estado=in_review";
  const url = readString(row.payload_ref, "url");
  return url && url.startsWith("/") ? url : "/";
}

/**
 * Envía las entregas push pendientes. Idempotente por entrega: sólo toma filas
 * en `pending` y las cierra como `sent`, `failed` o `dead_letter`.
 */
export async function dispatchPendingPush(
  options: { limit?: number; recipientUserId?: string } = {},
): Promise<PushDispatchResult> {
  const result: PushDispatchResult = { candidates: 0, sent: 0, failed: 0, skipped: 0 };

  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"];
  if (!publicKey || !privateKey || !subject) return result;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);

  let query = supabaseAdmin
    .from("notification_deliveries")
    .select("id, event_type, recipient_user_id, attempt_count, payload_ref")
    .eq("channel", "push")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (options.recipientUserId) query = query.eq("recipient_user_id", options.recipientUserId);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as DeliveryRow[];
  result.candidates = rows.length;
  if (rows.length === 0) return result;

  const recipients = Array.from(new Set(rows.map((r) => r.recipient_user_id)));
  const { data: subsData, error: subsError } = await supabaseAdmin
    .from("notification_push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipients)
    .is("revoked_at", null);
  if (subsError) throw subsError;
  const subs = (subsData ?? []) as unknown as SubscriptionRow[];

  const byUser = new Map<string, SubscriptionRow[]>();
  for (const sub of subs) {
    const list = byUser.get(sub.user_id) ?? [];
    list.push(sub);
    byUser.set(sub.user_id, list);
  }

  const vapid = { subject, publicKey, privateKey };
  const nowIso = new Date().toISOString();

  for (const row of rows) {
    const targets = byUser.get(row.recipient_user_id) ?? [];
    if (targets.length === 0) {
      await supabaseAdmin
        .from("notification_deliveries")
        .update({ status: "skipped", delivered_at: nowIso, last_error: "no_active_subscription" })
        .eq("id", row.id);
      result.skipped += 1;
      continue;
    }

    const message = {
      data: {
        title: uncEventTitle(row.event_type),
        body: bodyFor(row),
        url: urlFor(row),
        tag: row.event_type,
      },
      options: { ttl: 3600, urgency: "high" as const },
    };

    let delivered = false;
    let lastError = "";

    for (const target of targets) {
      const subscription = {
        endpoint: target.endpoint,
        expirationTime: null,
        keys: { p256dh: target.p256dh, auth: target.auth },
      };
      try {
        const payload = await buildPushPayload(message, subscription, vapid);
        const response = await fetch(target.endpoint, {
          method: payload.method,
          headers: payload.headers,
          body: payload.body as unknown as BodyInit,
        });
        if (response.ok) {
          delivered = true;
        } else if (response.status === 404 || response.status === 410) {
          await supabaseAdmin
            .from("notification_push_subscriptions")
            .update({ revoked_at: nowIso })
            .eq("id", target.id);
          lastError = `gone:${response.status}`;
        } else {
          lastError = `http_${response.status}`;
        }
      } catch (err) {
        lastError = (err as Error)?.message ?? "push_send_failed";
      }
    }

    if (delivered) {
      await supabaseAdmin
        .from("notification_deliveries")
        .update({ status: "sent", delivered_at: nowIso, attempt_count: row.attempt_count + 1 })
        .eq("id", row.id);
      result.sent += 1;
      continue;
    }

    const attempts = row.attempt_count + 1;
    await supabaseAdmin
      .from("notification_deliveries")
      .update({
        status: attempts >= MAX_ATTEMPTS ? "dead_letter" : "pending",
        attempt_count: attempts,
        last_error: lastError.slice(0, 200) || "push_send_failed",
      })
      .eq("id", row.id);
    result.failed += 1;
  }

  return result;
}
