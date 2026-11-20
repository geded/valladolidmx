/**
 * managed-send.server.ts — Envío directo por el servicio de correo gestionado.
 *
 * Sustituye a la antigua cola (`enqueue_email`). Recibe la misma carga ya
 * renderizada que antes se encolaba, la envía de inmediato y registra el
 * resultado en `email_send_log` ('sent' / 'suppressed'). Nunca lanza: devuelve
 * `{ error }` con la misma forma que la RPC anterior para que los llamadores
 * conserven su propio registro de fallos.
 */
import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";

interface ManagedPayload {
  message_id?: string;
  to: string;
  from: string;
  sender_domain: string;
  subject: string;
  html: string;
  text: string;
  purpose?: string;
  label?: string;
  idempotency_key?: string;
  [key: string]: unknown;
}

export async function sendManagedPayload(
  client: unknown,
  args: { queue_name?: string; payload: ManagedPayload },
): Promise<{ error: { message: string } | null; suppressed?: boolean }> {
  const p = args.payload;
  const db = client as { from: (t: string) => any };
  const log = async (status: "sent" | "suppressed") => {
    try {
      const { error } = await db.from("email_send_log").insert({
        message_id: p.message_id ?? null,
        template_name: p.label ?? "unknown",
        recipient_email: p.to,
        status,
      });
      if (error) console.error("email_send_log insert failed", { code: error.code, message: error.message });
    } catch (err) {
      console.error("email_send_log insert failed", err instanceof Error ? err.message : err);
    }
  };

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { error: { message: "LOVABLE_API_KEY is not configured" } };

  try {
    await sendLovableEmail(
      {
        to: p.to,
        from: p.from,
        sender_domain: p.sender_domain,
        subject: p.subject,
        html: p.html,
        text: p.text,
        purpose: "transactional",
        label: p.label ?? "app-email",
        idempotency_key: p.idempotency_key || crypto.randomUUID(),
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === "recipient_suppressed") {
      await log("suppressed");
      return { error: null, suppressed: true };
    }
    return { error: { message: error instanceof Error ? error.message : String(error) } };
  }
  await log("sent");
  return { error: null };
}
