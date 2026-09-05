/**
 * Ola 6.1 · Recordatorios de reseña tras canje de cupón (trabajo cron).
 *  - Reminder 1: entre 46 y 50 horas post-canje
 *  - Reminder 2: entre 6 y 8 días post-canje (sólo si ya se envió el 1)
 *
 * Lote 3M-A: la lógica se extrajo verbatim de la ruta para que el gancho sea
 * `autorización → trabajo` y el trabajo pueda probarse con un cliente
 * simulado (0 envíos reales). La autorización vive en `cron-hook-auth.server`.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";
import type { CronJobResult, CronSupabase } from "@/lib/cron/cron-hook-auth.server";

const SITE_NAME = "valladolidmx";
const SENDER_DOMAIN = "notify.alux.travel";
const FROM_DOMAIN = "notify.alux.travel";
const PUBLIC_ORIGIN = "https://valladolid.mx";

export type CouponReminderRow = {
  coupon_id: string;
  user_id: string;
  business_id: string;
  business_slug: string;
  business_name: string;
  promotion_title: string;
  coupon_code: string;
  discount_percent: number | null;
  redeemed_at: string;
  recipient_email: string;
  traveler_first_name: string;
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function runCouponReviewReminders(supabase: CronSupabase): Promise<CronJobResult> {
  const template = TEMPLATES["coupon-review-reminder"];
  if (!template) {
    return { status: 500, body: { ok: false, error: "template_not_found" } };
  }

  const results = { reminder_1: 0, reminder_2: 0, failed: 0, suppressed: 0 };

  for (const reminderNumber of [1, 2] as const) {
    const [hoursMin, hoursMax] = reminderNumber === 1 ? [46, 50] : [24 * 6, 24 * 8];
    const { data, error } = await supabase.rpc("get_coupons_needing_review_reminder", {
      reminder_number: reminderNumber,
      hours_min: hoursMin,
      hours_max: hoursMax,
    });
    if (error) {
      console.error("reminder RPC failed", { reminderNumber, error });
      continue;
    }
    const rows = (data ?? []) as CouponReminderRow[];
    for (const row of rows) {
      try {
        // Suppression check
        const email = row.recipient_email.toLowerCase().trim();
        const { data: suppressed } = await supabase
          .from("suppressed_emails")
          .select("email")
          .eq("email", email)
          .maybeSingle();
        if (suppressed) {
          results.suppressed += 1;
          // Mark as sent so we don't retry infinitely
          await supabase
            .from("traveler_coupons")
            .update(
              reminderNumber === 1
                ? { review_reminder_1_sent_at: new Date().toISOString() }
                : { review_reminder_2_sent_at: new Date().toISOString() },
            )
            .eq("id", row.coupon_id);
          continue;
        }

        // Ensure unsubscribe token
        let unsubToken: string | null = null;
        const { data: existingToken } = await supabase
          .from("email_unsubscribe_tokens")
          .select("token, used_at")
          .eq("email", email)
          .maybeSingle();
        if (existingToken && !existingToken.used_at) {
          unsubToken = existingToken.token;
        } else if (!existingToken) {
          const newToken = generateToken();
          await supabase
            .from("email_unsubscribe_tokens")
            .upsert({ email, token: newToken }, { onConflict: "email", ignoreDuplicates: true });
          const { data: readBack } = await supabase
            .from("email_unsubscribe_tokens")
            .select("token")
            .eq("email", email)
            .maybeSingle();
          unsubToken = readBack?.token ?? newToken;
        }

        const templateData = {
          travelerName: row.traveler_first_name || undefined,
          businessName: row.business_name,
          reminderNumber,
          reviewUrl: `${PUBLIC_ORIGIN}/resenar/negocio/${row.business_slug}`,
        };
        const element = React.createElement(template.component, templateData);
        const html = await render(element);
        const text = await render(element, { plainText: true });
        const subject =
          typeof template.subject === "function"
            ? template.subject(templateData)
            : template.subject;

        const messageId = crypto.randomUUID();
        const idempotencyKey = `review-reminder-${reminderNumber}-${row.coupon_id}`;

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: "coupon-review-reminder",
          recipient_email: email,
          status: "pending",
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
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
            label: "coupon-review-reminder",
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubToken,
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          results.failed += 1;
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: "coupon-review-reminder",
            recipient_email: email,
            status: "failed",
            error_message: enqueueError.message,
          });
          continue;
        }

        // Mark reminder as sent
        await supabase
          .from("traveler_coupons")
          .update(
            reminderNumber === 1
              ? { review_reminder_1_sent_at: new Date().toISOString() }
              : { review_reminder_2_sent_at: new Date().toISOString() },
          )
          .eq("id", row.coupon_id);

        if (reminderNumber === 1) results.reminder_1 += 1;
        else results.reminder_2 += 1;
      } catch (err) {
        console.error("reminder send failed", {
          coupon_id: row.coupon_id,
          err: err instanceof Error ? err.message : String(err),
        });
        results.failed += 1;
      }
    }
  }

  return { body: { ok: true, ...results } };
}
