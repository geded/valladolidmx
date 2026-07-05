import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ProfileMode = "traveler" | "business" | "concierge" | "staff";

export interface AvailableModeRow {
  mode: ProfileMode;
  available: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  entityCount: number;
}

/**
 * US-EPS.1 · Devuelve los modos disponibles del usuario autenticado.
 * Consume RPC `profile_get_available_modes` (SECURITY DEFINER, GRANT authenticated).
 */
export const getAvailableModes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailableModeRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("profile_get_available_modes");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      mode: r.mode as ProfileMode,
      available: !!r.available,
      primaryLabel: r.primary_label,
      secondaryLabel: r.secondary_label,
      entityCount: r.entity_count ?? 0,
    }));
  });

const setActiveModeSchema = z.object({
  mode: z.enum(["traveler", "business", "concierge", "staff"]),
});

/**
 * US-EPS.1 · Cambia el modo activo del usuario autenticado.
 * Consume RPC `profile_set_active_mode` que valida disponibilidad antes de escribir.
 */
export const setActiveMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => setActiveModeSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ mode: ProfileMode }> => {
    const { supabase } = context;
    const { data: mode, error } = await supabase.rpc("profile_set_active_mode", {
      _mode: data.mode,
    });
    if (error) {
      // Mensajes canónicos definidos en la RPC
      if (error.message.includes("mode_not_available")) {
        throw new Error("Ese modo no está disponible para tu cuenta.");
      }
      if (error.message.includes("not_authenticated")) {
        throw new Error("Debes iniciar sesión para cambiar de modo.");
      }
      throw new Error(error.message);
    }
    return { mode: mode as ProfileMode };
  });