import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Construye un cliente Supabase para el contexto MCP:
 *  - Si hay bearer token → cliente scoped al usuario (RLS aplica como ese usuario).
 *  - Si no hay token → cliente anon (para tools públicas).
 *
 * Nota: los `sb_publishable_*` keys son opacos, no JWTs. Enviar sólo apikey.
 */
function newFormatKey(k: string): boolean {
  return k.startsWith("sb_publishable_") || k.startsWith("sb_secret_");
}

export function supabaseFor(ctx: ToolContext | null): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase backend not configured.");
  const bearer = ctx?.isAuthenticated() ? ctx.getToken() : undefined;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // Fallback anon: no dejamos que el SDK meta el sb_ key como bearer.
        if (!bearer && newFormatKey(key) && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
