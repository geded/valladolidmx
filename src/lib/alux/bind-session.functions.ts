/**
 * Ola A17 · Vincular sesión anónima de Alux con el viajero autenticado.
 *
 * Cuando el visitante inicia sesión, unimos su `session_key` (opaco,
 * por dispositivo) con su `auth.uid()` para que la memoria territorial
 * (Ola A16) se consolide entre dispositivos y sesiones futuras del
 * mismo viajero — sin exponer PII y sin romper el modelo anónimo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ sessionKey: z.string().min(8).max(128) });

export const bindAluxSessionToTraveler = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ bound: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("alux_public_sessions")
      .update({ traveler_user_id: context.userId })
      .eq("session_key", data.sessionKey);
    if (error) return { bound: false };
    return { bound: true };
  });