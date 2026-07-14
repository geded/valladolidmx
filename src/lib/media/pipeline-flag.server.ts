/**
 * H3·A4 · M0 · Feature flag del Media Pipeline (server-only).
 *
 * Fuente única: platform_settings.key = 'media_pipeline_enabled'.
 * Default seguro: false. Cualquier lectura fallida devuelve false.
 *
 * Nunca importar este archivo desde componentes client-side. La
 * lectura del flag ocurre en servidor durante la resolución del
 * asset o en jobs de derivación.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CACHE_TTL_MS = 30_000;
let cache: { value: boolean; at: number } | null = null;

export async function isMediaPipelineEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  try {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "media_pipeline_enabled")
      .maybeSingle();

    if (error) throw error;
    const raw = (data?.value as unknown) ?? false;
    const value =
      typeof raw === "boolean"
        ? raw
        : typeof raw === "string"
          ? raw === "true"
          : Boolean(raw);
    cache = { value, at: now };
    return value;
  } catch {
    cache = { value: false, at: now };
    return false;
  }
}

export function invalidateMediaPipelineFlagCache() {
  cache = null;
}
