/**
 * 14.50.3 — UNC · Preferencias, categorías y consentimiento
 *
 * Server functions del Centro de Notificaciones para el usuario final.
 * Reglas aplicadas en la RPC SECURITY DEFINER:
 *   - Transaccional y Seguridad: inmutables, siempre habilitadas.
 *   - Operativa y Marketing: el canal in_app puede alternarse libremente.
 *     Canales no in_app requieren consentimiento explícito al habilitarse.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Enums"]["notification_category"];
type Channel = Database["public"]["Enums"]["notification_channel"];

export interface PreferenceRow {
  category: Category;
  channel: Channel;
  enabled: boolean;
  locked: boolean;
  consent_at: string | null;
}

export const listMyNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("unc_list_my_preferences");
    if (error) throw error;
    return { items: (data ?? []) as PreferenceRow[] };
  });

export const setMyNotificationPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { category: Category; channel: Channel; enabled: boolean; consent?: boolean }) => {
      if (!input?.category || !input?.channel || typeof input.enabled !== "boolean") {
        throw new Error("setMyNotificationPreference: parámetros incompletos");
      }
      return { ...input, consent: Boolean(input.consent ?? false) };
    },
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("unc_set_my_preference", {
      _category: data.category,
      _channel: data.channel,
      _enabled: data.enabled,
      _consent: data.consent,
    });
    if (error) throw error;
    return { preference: row };
  });