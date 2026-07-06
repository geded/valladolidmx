/**
 * cms/business-locations.functions.ts — Ubicación primaria de negocios.
 *
 * Todo negocio en la plataforma debe tener coordenadas geográficas para
 * que el visitante vea distancia/tiempo y para que Alux calcule cercanía
 * y recomendaciones territoriales. Este módulo expone la mutación única
 * que crea o actualiza la fila `is_primary=true` de `business_locations`
 * ligada al negocio, y una lectura conveniente para el editor.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface BusinessPrimaryLocationDTO {
  id: string | null;
  latitude: number | null;
  longitude: number | null;
  address_line1: string | null;
  label: string | null;
}

function coerceCoord(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new Error("Coordenadas inválidas");
  }
  return v;
}

export const getBusinessPrimaryLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => {
    if (!input?.businessId || typeof input.businessId !== "string") {
      throw new Error("businessId requerido");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<BusinessPrimaryLocationDTO> => {
    const { data: row, error } = await context.supabase
      .from("business_locations")
      .select("id, latitude, longitude, address_line1, label, is_primary")
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (row?.id as string) ?? null,
      latitude: row?.latitude ?? null,
      longitude: row?.longitude ?? null,
      address_line1: row?.address_line1 ?? null,
      label: row?.label ?? null,
    };
  });

export const upsertBusinessPrimaryLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      latitude: number;
      longitude: number;
      address_line1?: string | null;
      label?: string | null;
    }) => {
      if (!input?.businessId || typeof input.businessId !== "string") {
        throw new Error("businessId requerido");
      }
      const lat = coerceCoord(input.latitude, -90, 90);
      const lng = coerceCoord(input.longitude, -180, 180);
      const address_line1 =
        typeof input.address_line1 === "string"
          ? input.address_line1.trim().slice(0, 200) || null
          : null;
      const label =
        typeof input.label === "string"
          ? input.label.trim().slice(0, 80) || null
          : null;
      return { businessId: input.businessId, latitude: lat, longitude: lng, address_line1, label };
    },
  )
  .handler(async ({ data, context }): Promise<BusinessPrimaryLocationDTO> => {
    const { supabase, userId } = context;
    const { data: existing, error: readErr } = await supabase
      .from("business_locations")
      .select("id")
      .eq("business_id", data.businessId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from("business_locations")
        .update({
          latitude: data.latitude,
          longitude: data.longitude,
          address_line1: data.address_line1,
          label: data.label ?? "Ubicación principal",
          updated_by: userId,
        })
        .eq("id", existing.id)
        .select("id, latitude, longitude, address_line1, label")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return {
        id: (updated?.id as string) ?? existing.id,
        latitude: updated?.latitude ?? data.latitude,
        longitude: updated?.longitude ?? data.longitude,
        address_line1: updated?.address_line1 ?? data.address_line1,
        label: updated?.label ?? data.label,
      };
    }

    const { data: inserted, error } = await supabase
      .from("business_locations")
      .insert({
        business_id: data.businessId,
        latitude: data.latitude,
        longitude: data.longitude,
        address_line1: data.address_line1,
        label: data.label ?? "Ubicación principal",
        is_primary: true,
        created_by: userId,
        updated_by: userId,
      })
      .select("id, latitude, longitude, address_line1, label")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (inserted?.id as string) ?? null,
      latitude: inserted?.latitude ?? data.latitude,
      longitude: inserted?.longitude ?? data.longitude,
      address_line1: inserted?.address_line1 ?? data.address_line1,
      label: inserted?.label ?? data.label,
    };
  });