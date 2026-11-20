/**
 * registerTravelerSignup — se llama una vez por dispositivo tras iniciar sesión.
 *
 * Si la cuenta es un registro nuevo de viajero (rol viajero, creada en las
 * últimas 72 h), envía a la administración el correo «Nuevo viajero
 * registrado». La clave de idempotencia evita duplicados aunque el viajero
 * entre desde varios dispositivos. Nunca rompe la sesión del viajero.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE } from "@/config/site";
import {
  isNewTravelerSignup,
  resolveSignupAdminRecipients,
  savedItemsLabel,
  signupMethodLabel,
} from "./traveler-signup-admin";

function dateTimeLabel(iso: string): string | undefined {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Merida",
    }).format(new Date(iso));
  } catch {
    return undefined;
  }
}

export const registerTravelerSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isNew: boolean; emailed: number; savedItems: number }> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name, first_name, last_name, email, phone, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);

    if (!profile || !isNewTravelerSignup(profile.created_at, roles)) {
      return { isNew: false, emailed: 0, savedItems: 0 };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");

      const { data: settings } = await supabaseAdmin
        .from("platform_settings")
        .select("key, value")
        .in("key", ["notifications.admin_signup_emails", "notifications.internal_email"]);
      const byKey = new Map((settings ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value]));

      let adminEmails: string[] = [];
      if (!byKey.get("notifications.admin_signup_emails") && !byKey.get("notifications.internal_email")) {
        const { data: adminRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "super_admin"]);
        const ids = (adminRoles ?? []).map((r: { user_id: string }) => r.user_id);
        if (ids.length > 0) {
          const { data: adminProfiles } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .in("user_id", ids);
          adminEmails = (adminProfiles ?? []).map((p: { email: string | null }) => p.email ?? "");
        }
      }

      const recipients = resolveSignupAdminRecipients({
        signupSetting: byKey.get("notifications.admin_signup_emails"),
        internalSetting: byKey.get("notifications.internal_email"),
        adminEmails,
        travelerEmail: profile.email,
      });

      // Lo que el viajero ya guardó en Mi Viaje (incluye su viaje sin cuenta importado).
      let savedItems = 0;
      const { data: plan } = await supabaseAdmin
        .from("travel_plans")
        .select("id")
        .eq("user_id", context.userId)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (plan?.id) {
        const { count } = await supabaseAdmin
          .from("travel_plan_items")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", plan.id);
        savedItems = count ?? 0;
      }

      const { data: travelerProfile } = await supabaseAdmin
        .from("traveler_profiles")
        .select("whatsapp_contact_consent")
        .eq("user_id", context.userId)
        .maybeSingle();

      const appMetadata = (context.claims as { app_metadata?: { provider?: unknown } } | undefined)
        ?.app_metadata;
      const name =
        profile.display_name ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
        undefined;
      const templateData = {
        travelerName: name,
        travelerEmail: profile.email ?? undefined,
        travelerPhone: profile.phone ?? undefined,
        whatsappConsent: Boolean(travelerProfile?.whatsapp_contact_consent),
        signupMethodLabel: signupMethodLabel(appMetadata?.provider),
        registeredAtLabel: profile.created_at ? dateTimeLabel(profile.created_at) : undefined,
        savedItemsLabel: savedItemsLabel(savedItems),
        adminUrl: `${SITE.url}/admin/turistas`,
      };

      let emailed = 0;
      for (const recipient of recipients) {
        const res = await enqueueTransactionalEmail(supabaseAdmin, {
          templateName: "traveler-signup-admin",
          recipientEmail: recipient,
          idempotencyKey: `traveler-signup-admin-${context.userId}-${recipient}`,
          label: "traveler-signup-admin",
          templateData,
        });
        if (res.ok) emailed += 1;
      }
      return { isNew: true, emailed, savedItems };
    } catch (err) {
      console.error("[traveler-signup-admin] notify failed", err instanceof Error ? err.message : err);
      return { isNew: true, emailed: 0, savedItems: 0 };
    }
  });
