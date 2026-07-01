/**
 * Admin user-management server functions.
 * Acceso restringido a super_admin (verificado en el handler).
 * Usa Supabase Auth Admin API (service role) sólo tras autorizar al llamante.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AppRoleSchema = z.enum([
  "traveler",
  "business_owner",
  "concierge",
  "concierge_lead",
  "editor",
  "admin",
]);

const InviteSchema = z.object({
  email: z.string().email(),
  role: AppRoleSchema,
  displayName: z.string().trim().max(120).optional(),
});

async function assertSuperAdmin(ctx: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(`No se pudo validar autorización: ${error.message}`);
  if (!data) throw new Error("Acceso denegado: se requiere super_admin.");
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin({ supabase: context.supabase, userId: context.userId });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Invitación por email (magic link). Usa plantilla `invite` de Lovable Emails.
    const { data: invited, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: data.displayName ? { display_name: data.displayName } : undefined,
      });
    if (inviteError || !invited?.user) {
      throw new Error(
        inviteError?.message ?? "No se pudo enviar la invitación.",
      );
    }

    // 2) Asigna el rol solicitado (además del rol traveler por defecto que crea el trigger).
    if (data.role !== "traveler") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: invited.user.id,
          role: data.role,
          created_by: context.userId,
        });
      if (roleError && !roleError.message.includes("duplicate")) {
        throw new Error(`Invitación enviada, pero no se pudo asignar el rol: ${roleError.message}`);
      }

      // 3) Auditoría explícita.
      await supabaseAdmin.from("permissions_audit_log").insert({
        actor_user_id: context.userId,
        target_user_id: invited.user.id,
        action: "role.assign",
        role: data.role,
        metadata: { surface: "/admin/sistema/usuarios", via: "invite" },
      });
    }

    return {
      ok: true as const,
      userId: invited.user.id,
      email: invited.user.email,
    };
  });
