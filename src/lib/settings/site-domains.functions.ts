/**
 * settings/site-domains.functions.ts
 *
 * Dominios públicos administrables (Configuración → Dominios).
 * Fuente de verdad única: `platform_settings`
 *   · `site.primary_domain`     → dominio canónico (SEO, canonical, OG, correos)
 *   · `site.alternate_domains`  → dominios adicionales conectados (lista)
 *
 * NO crea motor nuevo: reutiliza la tabla de ajustes existente y el
 * helper canónico `@/config/site`. Fail-safe: ante cualquier error se
 * conserva el dominio predeterminado del código.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_PUBLIC_DOMAIN, normalizeDomain } from "@/config/site";

export const PRIMARY_DOMAIN_KEY = "site.primary_domain";
export const ALTERNATE_DOMAINS_KEY = "site.alternate_domains";

export interface SiteDomainSettings {
  primaryDomain: string;
  alternateDomains: string[];
}

export const SITE_DOMAIN_DEFAULTS: SiteDomainSettings = {
  primaryDomain: DEFAULT_PUBLIC_DOMAIN,
  alternateDomains: [],
};

/** Normaliza una lista separada por comas/saltos de línea. */
export function normalizeDomainList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  for (const part of value.split(/[\s,;]+/)) {
    const host = normalizeDomain(part);
    if (host) seen.add(host);
  }
  return [...seen];
}

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Lectura pública (anon). Fail-safe: ante cualquier error, predeterminados. */
export const getSiteDomainSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteDomainSettings> => {
    try {
      const { data, error } = await publicClient()
        .from("platform_settings")
        .select("key, value")
        .in("key", [PRIMARY_DOMAIN_KEY, ALTERNATE_DOMAINS_KEY])
        .eq("is_public", true);
      if (error || !data) return SITE_DOMAIN_DEFAULTS;

      const byKey = new Map(data.map((r) => [r.key, r.value]));
      return {
        primaryDomain:
          normalizeDomain(byKey.get(PRIMARY_DOMAIN_KEY)) ?? SITE_DOMAIN_DEFAULTS.primaryDomain,
        alternateDomains: normalizeDomainList(byKey.get(ALTERNATE_DOMAINS_KEY)),
      };
    } catch {
      return SITE_DOMAIN_DEFAULTS;
    }
  },
);
