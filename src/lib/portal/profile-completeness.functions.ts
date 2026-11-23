/**
 * Fase A · «Tu ficha para Alux» en el Portal.
 *
 * Devuelve el avance de la ficha de las empresas que la persona puede ver.
 * La función `business_profile_signals` sólo responde por empresas
 * publicadas o que la persona administra (o todas para administración).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  computeProfileCompleteness,
  type BusinessProfileSignals,
  type ProfileCompleteness,
} from "@/lib/visibility/profile-completeness";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BUSINESSES = 200;

export interface BusinessCompletenessEntry extends ProfileCompleteness {
  readonly businessId: string;
}

export const getMyBusinessesCompleteness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessIds: string[] }) => {
    const ids = Array.isArray(input?.businessIds) ? input.businessIds : [];
    const clean = [...new Set(ids.filter((id) => typeof id === "string" && UUID.test(id)))];
    return { businessIds: clean.slice(0, MAX_BUSINESSES) };
  })
  .handler(async ({ data, context }): Promise<BusinessCompletenessEntry[]> => {
    if (data.businessIds.length === 0) return [];
    const { data: rows, error } = await context.supabase.rpc("business_profile_signals", {
      _business_ids: data.businessIds,
    });
    if (error) throw new Error(`No se pudo leer el avance de la ficha: ${error.message}`);
    return ((rows ?? []) as BusinessProfileSignals[]).map((row) => ({
      businessId: row.business_id,
      ...computeProfileCompleteness(row),
    }));
  });
