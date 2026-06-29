/**
 * portal/portal-reads.functions.ts — Lecturas autenticadas del Portal
 * Empresarial (Ola 3 · Etapa 1).
 *
 * Reglas (Plan 14.30):
 *  - Todas las funciones usan requireSupabaseAuth (RLS aplica como user).
 *  - El listado de empresas accesibles se filtra explícitamente por
 *    business_users.user_id = auth.uid() para evitar exponer IDs ajenos
 *    (mitigación RW3-7).
 *  - Verificación dura de pertenencia vía has_business_access se realiza
 *    en cada handler de escritura (Etapas posteriores).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PortalBusinessRole = "viewer" | "editor" | "manager" | "owner";

export interface PortalBusinessSummary {
  business_id: string;
  slug: string;
  display_name: string;
  status: string;
  verified: boolean;
  role: PortalBusinessRole;
}

/**
 * listMyBusinesses — Devuelve las empresas en las que el usuario actual
 * tiene una membresía activa (business_users.status = 'active').
 *
 * No usa SUPABASE_SERVICE_ROLE_KEY. RLS aplica como el usuario
 * autenticado. El filtro por user_id es defensivo (además de RLS).
 */
export const listMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalBusinessSummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_users")
      .select(
        "role, status, business:businesses!inner(id, slug, display_name, status, verified, deleted_at)",
      )
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw new Error(`portal_list_failed: ${error.message}`);
    return (data ?? [])
      .map((row) => {
        const b = (row as { business: unknown }).business as {
          id: string;
          slug: string;
          display_name: string;
          status: string;
          verified: boolean | null;
          deleted_at: string | null;
        } | null;
        if (!b || b.deleted_at) return null;
        return {
          business_id: b.id,
          slug: String(b.slug),
          display_name: b.display_name,
          status: b.status,
          verified: Boolean(b.verified),
          role: (row as { role: PortalBusinessRole }).role,
        } satisfies PortalBusinessSummary;
      })
      .filter((x): x is PortalBusinessSummary => x !== null)
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "es"));
  });

/**
 * getMyBusinessAccess — Verifica server-side que el usuario actual tiene
 * acceso a una empresa con el rol mínimo solicitado. Útil como guarda
 * en loaders de detalle del Portal (Etapas posteriores).
 */
export const getMyBusinessAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { businessId: string; minRole?: PortalBusinessRole }) => {
      if (!input || typeof input.businessId !== "string") {
        throw new Error("invalid_input");
      }
      const minRole: PortalBusinessRole = input.minRole ?? "viewer";
      return { businessId: input.businessId, minRole };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: allowed, error } = await supabase.rpc("has_business_access", {
      _user_id: userId,
      _business_id: data.businessId,
      _min_role: data.minRole,
    });
    if (error) throw new Error(`access_check_failed: ${error.message}`);
    return { allowed: Boolean(allowed) };
  });