/**
 * E-PS · US-EPS.1/2 · Profile Switcher — server fns
 *
 * `getProfileModeState` — devuelve el modo activo del usuario y los
 *   modos disponibles según sus asociaciones (business_users,
 *   concierge_profiles, user_roles). Estilo Airbnb: si el usuario no
 *   tiene aún fila en `profiles`, el modo activo por defecto es "traveler".
 *
 * `setActiveMode` — persiste el modo elegido si está en la lista de
 *   disponibles (validado también por el RPC SECURITY DEFINER).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ProfileMode = Database["public"]["Enums"]["profile_mode"];

export interface ProfileModeState {
  active: ProfileMode;
  available: ProfileMode[];
}

const ALLOWED: ReadonlyArray<ProfileMode> = [
  "traveler",
  "business",
  "concierge",
  "staff",
];

function normalizeMode(m: unknown): ProfileMode {
  if (typeof m === "string" && (ALLOWED as readonly string[]).includes(m)) {
    return m as ProfileMode;
  }
  throw new Error("invalid_mode");
}

export const getProfileModeState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileModeState> => {
    const { supabase, userId } = context;

    const [{ data: profileRow }, { data: availableRaw, error: availErr }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("active_mode")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.rpc("get_available_modes", { _user_id: userId }),
      ]);

    if (availErr) {
      throw new Error(`available_modes_failed: ${availErr.message}`);
    }

    const available = ((availableRaw as ProfileMode[] | null) ?? ["traveler"])
      .filter((m): m is ProfileMode => (ALLOWED as readonly string[]).includes(m));

    const stored = profileRow?.active_mode as ProfileMode | null | undefined;
    // Fallback Airbnb: si el modo almacenado ya no está disponible
    // (p.ej. le retiraron el rol), degradamos a traveler.
    const active: ProfileMode =
      stored && available.includes(stored) ? stored : "traveler";

    return { active, available };
  });

export const setActiveMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { mode: ProfileMode }) => ({
    mode: normalizeMode(data?.mode),
  }))
  .handler(async ({ data, context }): Promise<ProfileModeState> => {
    const { supabase, userId } = context;
    const { error } = await supabase.rpc("set_active_mode", { _mode: data.mode });
    if (error) throw new Error(`set_active_mode_failed: ${error.message}`);
    // Devolvemos el estado completo para que el cliente refresque en un solo round-trip.
    const { data: availableRaw, error: availErr } = await supabase.rpc(
      "get_available_modes",
      { _user_id: userId },
    );
    if (availErr) throw new Error(`available_modes_failed: ${availErr.message}`);
    const available = ((availableRaw as ProfileMode[] | null) ?? ["traveler"])
      .filter((m): m is ProfileMode => (ALLOWED as readonly string[]).includes(m));
    return { active: data.mode, available };
  });