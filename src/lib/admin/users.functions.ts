/**
 * 15.10.4R · Paso E — Server functions de gestión de roles (super_admin).
 *
 * Reutilizan RPCs SECURITY DEFINER `admin_list_users_with_roles`,
 * `admin_assign_role` y `admin_revoke_role`, todas con autorización
 * server-side `has_role(auth.uid(),'super_admin')` y registro en
 * `permissions_audit_log`. No usan SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
}

const APP_ROLES: AppRole[] = [
  "traveler",
  "business_owner",
  "concierge",
  "concierge_lead",
  "editor",
  "admin",
  "super_admin",
];

const RoleSchema = z.enum(APP_ROLES as [AppRole, ...AppRole[]]);
const AssignSchema = z.object({ user_id: z.string().uuid(), role: RoleSchema });

/** Verifica si el invocador es super_admin; reutilizada por la UI para gating. */
export const isSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (error) throw new Error(error.message);
    return Boolean(data);
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_users_with_roles");
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminUserRow[];
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_assign_role", {
      _target_user_id: data.user_id,
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_revoke_role", {
      _target_user_id: data.user_id,
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const ASSIGNABLE_ROLES: AppRole[] = APP_ROLES.filter((r) => r !== "super_admin");