/**
 * enqueue.server.ts — Encolado interno de app-emails desde el servidor.
 *
 * Reutiliza la cola oficial (`enqueue_email` → `transactional_emails`) con
 * registro en `email_send_log`, verificación de supresión y token de baja.
 * Silent-fail: nunca rompe el flujo funcional que lo invoca.
 */
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "valladolidmx";
const SENDER_DOMAIN = "notify.alux.travel";
const FROM_DOMAIN = "notify.alux.travel";

type SupabaseAdmin = any;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface EnqueueEmailInput {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey: string;
  label?: string;
}

export async function enqueueTransactionalEmail(
  supabaseAdmin: SupabaseAdmin,
  input: EnqueueEmailInput,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  try {
    const email = (input.recipientEmail ?? "").toLowerCase().trim();
    if (!email) return { ok: false, skipped: "missing_email" };

    const template = TEMPLATES[input.templateName];
    if (!template) return { ok: false, error: "template_not_found" };

    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (suppressed) return { ok: false, skipped: "suppressed" };

    let unsubToken: string | null = null;
    const { data: existingToken } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", email)
      .maybeSingle();
    if (existingToken && !existingToken.used_at) {
      unsubToken = existingToken.token;
    } else if (!existingToken) {
      const newToken = generateToken();
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert({ email, token: newToken }, { onConflict: "email", ignoreDuplicates: true });
      const { data: readBack } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", email)
        .maybeSingle();
      unsubToken = readBack?.token ?? newToken;
    }

    const templateData = input.templateData ?? {};
    const element = React.createElement(template.component, templateData);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof template.subject === "function" ? template.subject(templateData) : template.subject;

    const messageId = crypto.randomUUID();

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: email,
      status: "pending",
    });

    const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
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
        label: input.label ?? input.templateName,
        idempotency_key: input.idempotencyKey,
        unsubscribe_token: unsubToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: input.templateName,
        recipient_email: email,
        status: "failed",
        error_message: enqueueError.message,
      });
      return { ok: false, error: enqueueError.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("enqueueTransactionalEmail failed", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
