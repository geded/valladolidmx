/**
 * Aviso por correo a la administración cuando alguien reclama o da de alta
 * una empresa. Nunca rompe la solicitud del anfitrión.
 */
import { SITE } from "@/config/site";
import { resolveSignupAdminRecipients } from "@/lib/notifications/traveler-signup-admin";

export async function notifyAdminsBusinessRequest(input: {
  kind: "claim" | "registration";
  businessId: string;
  requesterId: string;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
    const [{ data: biz }, { data: profile }, { data: settings }] = await Promise.all([
      supabaseAdmin.from("businesses").select("display_name").eq("id", input.businessId).maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("display_name, first_name, last_name, email")
        .eq("user_id", input.requesterId)
        .maybeSingle(),
      supabaseAdmin.from("platform_settings").select("key, value").eq("key", "notifications.internal_email"),
    ]);
    const internal = (settings ?? [])[0]?.value;
    let adminEmails: string[] = [];
    if (!internal) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);
      const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length) {
        const { data: ps } = await supabaseAdmin.from("profiles").select("email").in("user_id", ids);
        adminEmails = (ps ?? []).map((p: { email: string | null }) => p.email ?? "");
      }
    }
    const recipients = resolveSignupAdminRecipients({
      internalSetting: internal,
      adminEmails,
      travelerEmail: profile?.email ?? null,
    });
    const name =
      profile?.display_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      undefined;
    const { data: similar } = await supabaseAdmin
      .from("businesses")
      .select("display_name")
      .neq("id", input.businessId)
      .is("deleted_at", null)
      .ilike("display_name", `%${(biz?.display_name ?? "").split(" ")[0] ?? ""}%`)
      .limit(3);
    const templateData = {
      kindLabel: input.kind === "claim" ? "Reclamo de empresa" : "Alta de empresa nueva",
      businessName: biz?.display_name ?? undefined,
      requesterName: name,
      requesterEmail: profile?.email ?? undefined,
      similarLabel:
        input.kind === "registration" && similar && similar.length
          ? similar.map((s: { display_name: string }) => s.display_name).join(", ")
          : undefined,
      adminUrl: `${SITE.url}/admin/anfitriones`,
    };
    for (const recipient of recipients) {
      await enqueueTransactionalEmail(supabaseAdmin, {
        templateName: "business-request-admin",
        recipientEmail: recipient,
        idempotencyKey: `business-request-admin-${input.kind}-${input.businessId}-${input.requesterId}-${recipient}`,
        label: "business-request-admin",
        templateData,
      });
    }
  } catch (err) {
    console.error("[business-request-admin] notify failed", err instanceof Error ? err.message : err);
  }
}
