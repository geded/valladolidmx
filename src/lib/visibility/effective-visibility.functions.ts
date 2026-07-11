/**
 * effective-visibility.functions.ts — Ola 7 · Sub-ola 7.3.a
 *
 * Consulta el plan de visibilidad efectivo de una empresa (grant activo
 * vigente o plan Básico por defecto), leyendo la RPC `get_business_active_plan`.
 * Se usa desde superficies de portal, discovery y Alux para aplicar
 * palancas y límites reales por empresa.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EffectiveVisibilityPlan {
  grant_id: string | null;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  tier: string | null;
  starts_at: string | null;
  expires_at: string | null;
  cycle_months: number | null;
  levers: Record<string, JsonValue>;
  limits: Record<string, JsonValue>;
  is_default: boolean;
}

function normalize(row: Record<string, unknown> | null): EffectiveVisibilityPlan | null {
  if (!row) return null;
  return {
    grant_id: (row.grant_id as string | null) ?? null,
    plan_id: row.plan_id as string,
    plan_code: row.plan_code as string,
    plan_name: row.plan_name as string,
    tier: (row.tier as string | null) ?? null,
    starts_at: (row.starts_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    cycle_months: (row.cycle_months as number | null) ?? null,
    levers: (row.levers as Record<string, JsonValue>) ?? {},
    limits: (row.limits as Record<string, JsonValue>) ?? {},
    is_default: Boolean(row.is_default),
  };
}

export const getBusinessActivePlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => input)
  .handler(async ({ data, context }): Promise<EffectiveVisibilityPlan | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase as any).rpc(
      "get_business_active_plan",
      { _business_id: data.businessId },
    );
    if (error) throw error;
    const row = Array.isArray(rows) ? rows[0] : rows;
    return normalize(row ?? null);
  });