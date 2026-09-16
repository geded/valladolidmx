/**
 * cms/event-location.functions.ts — Coordenadas de la sede del evento.
 *
 * Mismo contrato que `destination-location.functions.ts` y que la captura
 * de ubicación de lugares y sitios de interés: `events.latitude` /
 * `events.longitude` guardan el punto exacto de la sede para que el mapa
 * y los cálculos de cercanía de Alux funcionen igual en todas las fichas.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface EventLocationDTO {
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

export const getEventLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => {
    if (!input?.eventId || typeof input.eventId !== "string") {
      throw new Error("eventId requerido");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<EventLocationDTO> => {
    const { data: row, error } = await context.supabase
      .from("events")
      .select("latitude, longitude")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      latitude: row?.latitude ?? null,
      longitude: row?.longitude ?? null,
    };
  });

export const upsertEventLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; latitude: number; longitude: number }) => {
    if (!input?.eventId || typeof input.eventId !== "string") {
      throw new Error("eventId requerido");
    }
    return {
      eventId: input.eventId,
      latitude: coerceCoord(input.latitude, -90, 90),
      longitude: coerceCoord(input.longitude, -180, 180),
    };
  })
  .handler(async ({ data, context }): Promise<EventLocationDTO> => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("events")
      .update({
        latitude: data.latitude,
        longitude: data.longitude,
        updated_by: userId,
      })
      .eq("id", data.eventId)
      .select("latitude, longitude")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      latitude: updated?.latitude ?? data.latitude,
      longitude: updated?.longitude ?? data.longitude,
    };
  });
