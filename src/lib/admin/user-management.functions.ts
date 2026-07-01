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

const UserIdSchema = z.object({ userId: z.string().uuid() });
const UpdateEmailSchema = UserIdSchema.extend({ email: z.string().email() });
const UpdatePasswordSchema = UserIdSchema.extend({
  password: z.string().min(8).max(200),
});
const UpdateDisplayNameSchema = UserIdSchema.extend({
  displayName: z.string().trim().min(1).max(120),
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

async function auditAdminAction(params: {
  actorId: string;
  targetId: string;
  action: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("permissions_audit_log").insert({
    actor_user_id: params.actorId,
    target_user_id: params.targetId,
    action: params.action,
    metadata: params.metadata ?? { surface: "/admin/sistema/usuarios" },
  });
}

export const updateUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateEmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin({ supabase: context.supabase, userId: context.userId });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ email: data.email }).eq("user_id", data.userId);
    await auditAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      action: "user.email.update",
      metadata: { new_email: data.email },
    });
    return { ok: true as const };
  });

export const updateUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdatePasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin({ supabase: context.supabase, userId: context.userId });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await auditAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      action: "user.password.update",
    });
    return { ok: true as const };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email(), userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin({ supabase: context.supabase, userId: context.userId });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    await auditAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      action: "user.password.reset_link",
    });
    return { ok: true as const };
  });

export const updateUserDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateDisplayNameSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin({ supabase: context.supabase, userId: context.userId });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await auditAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      action: "user.profile.update",
      metadata: { display_name: data.displayName },
    });
    return { ok: true as const };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UserIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin({ supabase: context.supabase, userId: context.userId });
    if (data.userId === context.userId) {
      throw new Error("No puedes eliminar tu propia cuenta desde aquí.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Bloquea la eliminación de otro super_admin
    const { data: isTargetSuper } = await supabaseAdmin.rpc("has_role", {
      _user_id: data.userId,
      _role: "super_admin",
    });
    if (isTargetSuper) throw new Error("No se puede eliminar una cuenta super_admin.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await auditAdminAction({
      actorId: context.userId,
      targetId: data.userId,
      action: "user.delete",
    });
    return { ok: true as const };
  });
