/**
 * Cliente helper para invocar el endpoint interno de app-emails.
 * Requiere sesión de Supabase (envía el bearer del usuario).
 */
import { supabase } from "@/integrations/supabase/client";

export interface SendTransactionalEmailInput {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("no_session");
  const res = await fetch("/lovable/email/transactional/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`email_send_failed_${res.status}: ${body}`);
  }
  return res.json();
}