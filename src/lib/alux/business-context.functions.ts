/**
 * Ola A12 · Contexto proactivo de Alux en ficha de negocio.
 *
 * Server fn PÚBLICA (sin auth) que devuelve los horarios semanales
 * del negocio para que el chip cliente calcule `open-now` en la
 * timezone del Oriente Maya. Coupon activo se resuelve aparte
 * (requiere sesión Supabase del viajero) desde el propio componente.
 *
 * Contrato: sólo columnas seguras. Sin PII. Sin datos de contacto.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { BusinessHourRow } from "@/lib/business/open-now";

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getBusinessHoursPublic = createServerFn({ method: "GET" })
  .inputValidator((input: { businessId: string }) => {
    if (!input?.businessId || typeof input.businessId !== "string") {
      throw new Error("invalid_business_id");
    }
    return input;
  })
  .handler(async ({ data }): Promise<BusinessHourRow[]> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("business_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("business_id", data.businessId);
    if (error || !rows) return [];
    return rows as BusinessHourRow[];
  });