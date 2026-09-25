/**
 * Acción de servidor para los correos de la app disparados desde pantallas
 * autenticadas. Conserva la compuerta de autorización fail-closed del antiguo
 * endpoint y envía por el servicio de correo gestionado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  templateName: z.string().min(1).max(100),
  recipientEmail: z.string().max(320).optional().default(""),
  templateData: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().max(300).optional(),
});

export const sendAppEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin as any;

    const template = TEMPLATES[data.templateName];
    if (!template) throw new Error("template_not_found");
    const effectiveRecipient = template.to || data.recipientEmail;
    if (!effectiveRecipient) throw new Error("recipient_required");

    const userId = context.userId as string;
    const callerEmail = String((context.claims as { email?: string })?.email ?? "").toLowerCase();
    const target = effectiveRecipient.toLowerCase();

    // Compuerta de autorización (fail-closed): destinatario fijo, propio,
    // staff de plataforma, concierge interno o viajero con cupón del negocio.
    let authorized = Boolean(template.to) || (callerEmail !== "" && target === callerEmail);
    if (!authorized) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      authorized = Boolean(isAdmin);
    }
    if (!authorized) {
      const { data: isSuper } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
      authorized = Boolean(isSuper);
    }
    if (!authorized) {
      const { data: isInternal } = await supabase.rpc("concierge_is_internal", { _user_id: userId });
      authorized = Boolean(isInternal);
    }
    if (!authorized) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("email", target)
        .maybeSingle();
      const travelerId = profile?.user_id ?? null;
      if (travelerId) {
        const { data: memberships } = await supabase
          .from("business_users")
          .select("business_id")
          .eq("user_id", userId)
          .eq("status", "active")
          .in("role", ["editor", "manager", "owner"]);
        const businessIds = (memberships ?? [])
          .map((m: { business_id: string | null }) => m.business_id)
          .filter((id: string | null): id is string => Boolean(id));
        if (businessIds.length > 0) {
          const { data: coupon } = await supabase
            .from("traveler_coupons")
            .select("id")
            .eq("user_id", travelerId)
            .in("business_id", businessIds)
            .limit(1)
            .maybeSingle();
          authorized = Boolean(coupon);
        }
      }
    }
    if (!authorized) {
      console.warn("Blocked unauthorized app email", { templateName: data.templateName });
      throw new Error("forbidden");
    }

    const messageId = crypto.randomUUID();
    const logRow = async (row: Record<string, unknown>) => {
      const { error } = await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: data.templateName,
        recipient_email: effectiveRecipient,
        ...row,
      });
      if (error) console.error("email_send_log insert failed", { code: error.code, message: error.message });
    };

    try {
      const result = await sendTemplateEmail(data.templateName, effectiveRecipient, {
        templateData: data.templateData ?? {},
        idempotencyKey: data.idempotencyKey || messageId,
      });
      if (!result.sent) {
        await logRow({ status: "suppressed" });
        return { success: false, reason: "email_suppressed" as const };
      }
      await logRow({ status: "sent" });
      return { success: true };
    } catch (err) {
      await logRow({ status: "failed", error_message: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  });
