/**
 * H3·A4 · M2.3.1 · Kill switch de firmas persistidas (server-only).
 *
 * Fuente única: `platform_settings.media_persisted_signatures_enabled`.
 * Default seguro: false. Cualquier lectura fallida devuelve false (fail-closed).
 * Cache per-worker de 15 s para no bombardear Postgres cada minuto.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CACHE_TTL_MS = 15_000;
let cache: { value: boolean; at: number } | null = null;

export async function isPersistedSignaturesEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "media_persisted_signatures_enabled")
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

export function invalidatePersistedFlagCache(): void {
  cache = null;
}