/**
 * G8-Q2D-B · Fase 3 — Persistencia de la dirección visual de la ficha.
 *
 * Wrapper delgado: la autoridad vive en la RPC
 * `admin_set_place_presentation_mode` (SECURITY DEFINER, staff editorial o
 * permiso `poi.write`). Reglas vinculantes:
 *  - Cinematográfica exige portada gobernada aprobada (fail-closed en BD).
 *  - Cambiar la presentación NUNCA publica ni cambia el estado del lugar.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const setPlacePresentationMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { placeId: string; mode: "editorial" | "cinematic" }) => {
    if (!input || !UUID.test(input.placeId ?? "")) throw new Error("invalid_place_id");
    if (input.mode !== "editorial" && input.mode !== "cinematic")
      throw new Error("invalid_presentation_mode");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as {
      supabase: {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await ctx.supabase.rpc("admin_set_place_presentation_mode", {
      _place_id: data.placeId,
      _mode: data.mode,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, mode: data.mode, published: false as const };
  });
