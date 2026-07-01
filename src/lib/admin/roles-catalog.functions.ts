/**
 * Catálogo dinámico de roles y permisos.
 * Acceso restringido a super_admin (verificado en el handler).
 * Usa cliente autenticado (RLS también protege), pero además chequeamos
 * super_admin explícitamente para dar mensajes claros y evitar exponer
 * detalles a otros roles.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ────────────────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────────────────

const SlugRegex = /^[a-z0-9_]{3,40}$/;
const HexColor = /^#[0-9a-fA-F]{6}$/;

const RoleIdSchema = z.object({ roleId: z.string().uuid() });

const CreateRoleSchema = z.object({
  slug: z.string().regex(SlugRegex, "slug inválido (usa minúsculas, números y _)"),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(400).optional().default(""),
  color: z.string().regex(HexColor).optional().default("#64748b"),
  icon: z.string().trim().max(40).optional().default("shield"),
  permissionIds: z.array(z.string().uuid()).default([]),
});

const UpdateRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(400).optional(),
  color: z.string().regex(HexColor).optional(),
  icon: z.string().trim().max(40).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type Ctx = {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
};

async function assertSuperAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(`No se pudo validar autorización: ${error.message}`);
  if (!data) throw new Error("Acceso denegado: se requiere super_admin.");
}

async function auditRolesAction(
  ctx: Ctx,
  action: string,
  metadata: Record<string, unknown>,
) {
  await ctx.supabase.from("permissions_audit_log").insert({
    actor_user_id: ctx.userId,
    action,
    target_table: "roles_catalog",
    metadata,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Server functions
// ────────────────────────────────────────────────────────────────────────────

export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await context.supabase
      .from("permissions")
      .select("id, key, resource, action, category, label, description, is_dangerous")
      .order("category")
      .order("label");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data: roles, error } = await context.supabase
      .from("roles_catalog")
      .select(
        "id, slug, name, description, color, icon, is_system, system_role, sort_order, created_at",
      )
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);

    const { data: perms, error: permsErr } = await context.supabase
      .from("role_permissions")
      .select("role_id, permission_id");
    if (permsErr) throw new Error(permsErr.message);

    const byRole = new Map<string, string[]>();
    for (const rp of perms ?? []) {
      const list = byRole.get(rp.role_id) ?? [];
      list.push(rp.permission_id);
      byRole.set(rp.role_id, list);
    }

    return (roles ?? []).map((r) => ({
      ...r,
      permissionIds: byRole.get(r.id) ?? [],
    }));
  });

export const createRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const { data: role, error } = await context.supabase
      .from("roles_catalog")
      .insert({
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        color: data.color,
        icon: data.icon,
        is_system: false,
        system_role: null,
        sort_order: 500,
        created_by: context.userId,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(`No se pudo crear el rol: ${error.message}`);

    if (data.permissionIds.length > 0) {
      const rows = data.permissionIds.map((permission_id) => ({
        role_id: role.id,
        permission_id,
        granted_by: context.userId,
      }));
      const { error: rpErr } = await context.supabase.from("role_permissions").insert(rows);
      if (rpErr) throw new Error(`Rol creado pero fallaron los permisos: ${rpErr.message}`);
    }

    await auditRolesAction(context, "role.create", {
      role_id: role.id,
      slug: role.slug,
      permissions_count: data.permissionIds.length,
    });
    return { ok: true, roleId: role.id };
  });

export const updateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const patch: {
      name?: string;
      description?: string | null;
      color?: string;
      icon?: string | null;
    } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.color !== undefined) patch.color = data.color;
    if (data.icon !== undefined) patch.icon = data.icon;

    if (Object.keys(patch).length > 0) {
      const { error } = await context.supabase
        .from("roles_catalog")
        .update(patch)
        .eq("id", data.roleId);
      if (error) throw new Error(`No se pudo actualizar el rol: ${error.message}`);
    }

    if (data.permissionIds !== undefined) {
      const { error: delErr } = await context.supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", data.roleId);
      if (delErr) throw new Error(`No se pudieron limpiar permisos: ${delErr.message}`);

      if (data.permissionIds.length > 0) {
        const rows = data.permissionIds.map((permission_id) => ({
          role_id: data.roleId,
          permission_id,
          granted_by: context.userId,
        }));
        const { error: insErr } = await context.supabase
          .from("role_permissions")
          .insert(rows);
        if (insErr) throw new Error(`No se pudieron asignar permisos: ${insErr.message}`);
      }
    }

    await auditRolesAction(context, "role.update", {
      role_id: data.roleId,
      updated_fields: Object.keys(patch),
      permissions_updated: data.permissionIds !== undefined,
      permissions_count: data.permissionIds?.length ?? null,
    });
    return { ok: true };
  });

export const deleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RoleIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const { data: role, error: getErr } = await context.supabase
      .from("roles_catalog")
      .select("id, slug, is_system")
      .eq("id", data.roleId)
      .single();
    if (getErr) throw new Error(`No se encontró el rol: ${getErr.message}`);
    if (role.is_system) throw new Error("No se puede eliminar un rol de sistema.");

    const { error } = await context.supabase
      .from("roles_catalog")
      .delete()
      .eq("id", data.roleId);
    if (error) throw new Error(`No se pudo eliminar el rol: ${error.message}`);

    await auditRolesAction(context, "role.delete", {
      role_id: data.roleId,
      slug: role.slug,
    });
    return { ok: true };
  });