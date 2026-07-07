/**
 * cms/destination-location.functions.ts — Coordenadas del destino.
 *
 * Ola D1.5 · Panel 1. `destinations.latitude` / `destinations.longitude`
 * son la ubicación canónica del destino (map_center) que la plantilla
 * `__tpl_destination__` usa para centrar el mapa y para que Alux
 * calcule cercanías desde el visitante.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DestinationLocationDTO {
  latitude: number | null;
  longitude: number | null;
}

function coerceCoord(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new Error("Coordenadas inválidas");
  }
  return v;
}

export const getDestinationLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { destinationId: string }) => {
    if (!input?.destinationId || typeof input.destinationId !== "string") {
      throw new Error("destinationId requerido");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<DestinationLocationDTO> => {
    const { data: row, error } = await context.supabase
      .from("destinations")
      .select("latitude, longitude")
      .eq("id", data.destinationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      latitude: row?.latitude ?? null,
      longitude: row?.longitude ?? null,
    };
  });

export const upsertDestinationLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { destinationId: string; latitude: number; longitude: number }) => {
      if (!input?.destinationId || typeof input.destinationId !== "string") {
        throw new Error("destinationId requerido");
      }
      const lat = coerceCoord(input.latitude, -90, 90);
      const lng = coerceCoord(input.longitude, -180, 180);
      return { destinationId: input.destinationId, latitude: lat, longitude: lng };
    },
  )
  .handler(async ({ data, context }): Promise<DestinationLocationDTO> => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("destinations")
      .update({
        latitude: data.latitude,
        longitude: data.longitude,
        updated_by: userId,
      })
      .eq("id", data.destinationId)
      .select("latitude, longitude")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      latitude: updated?.latitude ?? data.latitude,
      longitude: updated?.longitude ?? data.longitude,
    };
  });