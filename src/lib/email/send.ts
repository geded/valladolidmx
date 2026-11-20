/**
 * Cliente helper para disparar correos de la app desde pantallas autenticadas.
 * Delega en la acción de servidor `sendAppEmail` (requiere sesión).
 */
import { sendAppEmail } from "@/lib/email/send.functions";

export interface SendTransactionalEmailInput {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  return sendAppEmail({ data: input });
}
