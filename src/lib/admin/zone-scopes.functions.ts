/**
 * 15.10.7.1 · Permisos por zona
 * Server functions para asignar/revocar/consultar scopes zonales.
 * Autorización delegada a las RPCs SECURITY DEFINER (assign_zone_scope /
 * revoke_zone_scope validan super_admin/admin en la base de datos).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ScopeTypeSchema = z.enum(["region", "destination"]);

const AppRoleSchema = z.enum([
  "traveler",
  "business_owner",
  "concierge",
  "concierge_lead",
  "editor",
  "admin",
  "super_admin",
]);

const AssignSchema = z.object({
  userId: z.string().uuid(),
  scopeType: ScopeTypeSchema,
  scopeId: z.string().uuid(),
  role: AppRoleSchema,
  notes: z.string().trim().max(500).optional().nullable(),
});

const RevokeSchema = z.object({ scopeId: z.string().uuid() });

const ListSchema = z.object({ userId: z.string().uuid() });

export type UserZoneScope = {
  id: string;
  scope_type: "region" | "destination";
  scope_id: string;
  role: z.infer<typeof AppRoleSchema>;
  granted_by: string | null;
  notes: string | null;
  created_at: string;
};

export const listUserZoneScopes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input))
  .handler(async ({ data, context }): Promise<UserZoneScope[]> => {
    const { data: rows, error } = await context.supabase.rpc(
      "user_zone_scopes_for",
      { _user_id: data.userId },
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as UserZoneScope[];
  });

export const assignUserZoneScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc(
      "assign_zone_scope",
      {
        _user_id: data.userId,
        _scope_type: data.scopeType,
        _scope_id: data.scopeId,
        _role: data.role,
        _notes: data.notes ?? undefined,
      },
    );
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const revokeUserZoneScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc(
      "revoke_zone_scope",
      { _scope_id: data.scopeId },
    );
    if (error) throw new Error(error.message);
    return { revoked: Boolean(ok) };
  });
