/**
 * Paso 10 · Correo al viajero de una reservación en línea (folio ERL).
 *
 * Disparado por el evento (registrada, pagada, cancelada, reembolsada) desde
 * las funciones de servidor que ya existen; no hay sondeo ni cola paralela.
 * Reutiliza la cola transaccional `enqueue_email`, la supresión y el token de
 * baja del canal de correo aprobado. Es idempotente por las marcas
 * `email_booking_*_at` de `concierge_orders` y nunca interrumpe la operación:
 * si algo falla, la reservación ya quedó registrada igualmente.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { formatInMerida } from "@/lib/time/merida";

const SITE_NAME = "valladolidmx";
const SENDER_DOMAIN = "notify.alux.travel";
const FROM_DOMAIN = "notify.alux.travel";
const PUBLIC_ORIGIN = "https://valladolid.mx";

export type BookingEmailKind = "created" | "paid" | "cancelled" | "refunded";

const KINDS: Record<BookingEmailKind, { template: string; column: string }> = {
  created: { template: "booking-created", column: "email_booking_created_at" },
  paid: { template: "booking-paid", column: "email_booking_paid_at" },
  cancelled: { template: "booking-cancelled", column: "email_booking_cancelled_at" },
  refunded: { template: "booking-refunded", column: "email_booking_refunded_at" },
};

interface PayloadRow {
  order_id: string;
  folio: string;
  traveler_email: string | null;
  traveler_name: string | null;
  traveler_locale: string | null;
  destination_name: string | null;
  total_amount: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  cancelled_reason: string | null;
  refunded_amount: number | null;
  departure_starts_at: string | null;
  departure_timezone: string | null;
  seats: number | null;
  items: Array<{ title?: string; quantity?: number; amount?: number }> | null;
}

function money(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined) return undefined;
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency || "MXN",
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency || "MXN"}`;
  }
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildTemplateData(row: PayloadRow) {
  const firstName = (row.traveler_name ?? "").trim().split(/\s+/)[0] || undefined;
  const locale = row.traveler_locale || "es-MX";
  const departureLabel = row.departure_starts_at
    ? formatInMerida(
        row.departure_starts_at,
        { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
        locale,
      ) || undefined
    : undefined;
  const paidAtLabel = row.paid_at
    ? formatInMerida(
        row.paid_at,
        { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
        locale,
      ) || undefined
    : undefined;

  return {
    folio: row.folio,
    travelerName: firstName,
    destinationName: row.destination_name || undefined,
    departureLabel,
    seatsLabel: row.seats ? `${row.seats} ${row.seats === 1 ? "persona" : "personas"}` : undefined,
    totalLabel: money(row.total_amount, row.currency),
    paidAtLabel,
    refundLabel: money(row.refunded_amount, row.currency),
    reasonLabel: row.cancelled_reason || undefined,
    items: (row.items ?? []).map((item) => ({
      title: item.title,
      quantityLabel: item.quantity ? `${item.quantity} ×` : undefined,
      amountLabel: money(item.amount ?? null, row.currency),
    })),
    tripUrl: `${PUBLIC_ORIGIN}/cuenta/mi-viaje`,
  } as Record<string, unknown>;
}

/**
 * Encola el correo del viajero para una reservación. Nunca lanza: registra en
 * consola y devuelve el resultado para trazabilidad.
 */
export async function sendBookingTravelerEmail(
  orderId: string,
  kind: BookingEmailKind,
): Promise<{ sent: boolean; reason?: string }> {
  const step = KINDS[kind];
  const template = TEMPLATES[step.template];
  if (!template) return { sent: false, reason: "template_missing" };

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      from: (table: string) => any;
    };

    const { data, error } = await admin.rpc("get_booking_email_payload", {
      _order_id: orderId,
      _kind: kind,
    });
    if (error) return { sent: false, reason: "payload_error" };
    const row = ((data ?? []) as PayloadRow[])[0];
    if (!row) return { sent: false, reason: "already_sent_or_not_applicable" };

    const email = (row.traveler_email ?? "").toLowerCase().trim();
    if (!email) return { sent: false, reason: "no_email" };

    const nowIso = new Date().toISOString();

    const { data: suppressed } = await admin
      .from("suppressed_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (suppressed) {
      await admin.from("concierge_orders").update({ [step.column]: nowIso }).eq("id", orderId);
      return { sent: false, reason: "suppressed" };
    }

    let unsubToken: string | null = null;
    const { data: existingToken } = await admin
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", email)
      .maybeSingle();
    if (existingToken && !existingToken.used_at) {
      unsubToken = existingToken.token;
    } else if (!existingToken) {
      const newToken = generateToken();
      await admin
        .from("email_unsubscribe_tokens")
        .upsert({ email, token: newToken }, { onConflict: "email", ignoreDuplicates: true });
      const { data: readBack } = await admin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", email)
        .maybeSingle();
      unsubToken = readBack?.token ?? newToken;
    }

    const templateData = buildTemplateData(row);
    const element = React.createElement(template.component, templateData);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function" ? template.subject(templateData) : template.subject;

    const messageId = crypto.randomUUID();

    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: step.template,
      recipient_email: email,
      status: "pending",
    });

    const { error: enqueueError } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: step.template,
        idempotency_key: `booking-${kind}-${orderId}`,
        unsubscribe_token: unsubToken,
        queued_at: nowIso,
      },
    });

    if (enqueueError) {
      await admin.from("email_send_log").insert({
        message_id: messageId,
        template_name: step.template,
        recipient_email: email,
        status: "failed",
        error_message: (enqueueError as { message?: string }).message ?? "enqueue_failed",
      });
      return { sent: false, reason: "enqueue_failed" };
    }

    await admin.from("concierge_orders").update({ [step.column]: nowIso }).eq("id", orderId);
    return { sent: true };
  } catch (err) {
    console.error("booking traveler email failed", {
      orderId,
      kind,
      err: err instanceof Error ? err.message : String(err),
    });
    return { sent: false, reason: "exception" };
  }
}
