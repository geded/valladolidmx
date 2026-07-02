/**
 * i18n/locales.functions.ts — Fuente única de idiomas activos de la plataforma.
 *
 * H1 del plan "Auto-traducción + idiomas configurables":
 *  - `listActiveLocales()`: público. Devuelve los idiomas activos ordenados;
 *    lo consumen `I18nProvider`, `LanguageSwitcher`, el constructor y el
 *    traductor automático.
 *  - Escritura/desactivación se agregan en H2 (UI admin).
 *
 * Contrato: NUNCA lanza. Si la BD falla o la tabla no responde, cae al
 * fallback estático `ACTIVE_LOCALES` para no romper SSR ni la UI.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ACTIVE_LOCALES, DEFAULT_LOCALE } from "@/config/languages";

export interface PlatformLocaleDTO {
  code: string;
  label: string;
  native_label: string;
  flag: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

function staticFallback(): PlatformLocaleDTO[] {
  return ACTIVE_LOCALES.map((l, i) => ({
    code: l.code,
    label: l.label,
    native_label: l.native_label,
    flag: l.flag,
    is_default: l.code === DEFAULT_LOCALE,
    is_active: true,
    sort_order: i,
  }));
}

export const listActiveLocales = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformLocaleDTO[]> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return staticFallback();
    try {
      const supabase = createClient<Database>(url, key, {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      const { data, error } = await supabase
        .from("platform_locales")
        .select(
          "code, label, native_label, flag, is_default, is_active, sort_order",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error || !data || data.length === 0) return staticFallback();
      return data as PlatformLocaleDTO[];
    } catch {
      return staticFallback();
    }
  },
);