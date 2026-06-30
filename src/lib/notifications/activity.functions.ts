/**
 * 14.50.2 — UNC · Intelligent Activity Center (lectura)
 *
 * Vistas por rol del Centro de Actividad. Cada función verifica rol o
 * pertenencia dentro de su RPC `SECURITY DEFINER`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ActivityItem {
  kind: string;
  occurred_at: string;
  severity: string;
  title: string;
  ref: Record<string, unknown>;
}

const clampLimit = (n?: number) => Math.min(Math.max(n ?? 50, 1), 200);

export const getAdminActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({ limit: clampLimit(input?.limit) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_activity_admin", { _limit: data.limit });
    if (error) throw error;
    return { items: (rows ?? []) as ActivityItem[] };
  });

export const getBusinessActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; limit?: number }) => {
    if (!input?.businessId) throw new Error("businessId requerido");
    return { businessId: input.businessId, limit: clampLimit(input.limit) };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_activity_business", {
      _business_id: data.businessId,
      _limit: data.limit,
    });
    if (error) throw error;
    return { items: (rows ?? []) as ActivityItem[] };
  });

export const getTravelerActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => ({ limit: clampLimit(input?.limit) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("unc_activity_traveler", { _limit: data.limit });
    if (error) throw error;
    return { items: (rows ?? []) as ActivityItem[] };
  });