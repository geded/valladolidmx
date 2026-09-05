/**
 * Lote 3B — Configuración de Marca administrable (fuente única de verdad).
 *
 * La identidad editorial de la marca activa deja de vivir sólo en código:
 * se persiste en `platform_settings` bajo la clave `brand.identity` y se
 * lee públicamente (`is_public = true`). Los valores actuales de
 * `ACTIVE_BRAND` son los predeterminados y el fallback seguro: si no hay
 * registro, o si un campo viene vacío o con tipo inválido, se usa el valor
 * de código. Nunca se inventa contenido ni se generan activos nuevos.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { ACTIVE_BRAND } from "@/config/brand";

export const BRAND_SETTINGS_KEY = "brand.identity";

/** Campos editoriales administrables de la marca. */
export interface BrandSettings {
  name: string;
  shortName: string;
  tagline: string;
  discoveryPromise: string;
  conciergeName: string;
  logoSrc: string;
}

/** Predeterminados = identidad activa en código (sin cambio visual). */
export const BRAND_SETTINGS_DEFAULTS: BrandSettings = {
  name: ACTIVE_BRAND.name,
  shortName: ACTIVE_BRAND.shortName,
  tagline: ACTIVE_BRAND.tagline,
  discoveryPromise: ACTIVE_BRAND.discoveryPromise,
  conciergeName: ACTIVE_BRAND.conciergeName,
  logoSrc: ACTIVE_BRAND.logo.src,
};

const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

/** Normaliza cualquier valor persistido contra los predeterminados. */
export function normalizeBrandSettings(value: unknown): BrandSettings {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const logo = str(row.logoSrc, BRAND_SETTINGS_DEFAULTS.logoSrc);
  return {
    name: str(row.name, BRAND_SETTINGS_DEFAULTS.name),
    shortName: str(row.shortName, BRAND_SETTINGS_DEFAULTS.shortName),
    tagline: str(row.tagline, BRAND_SETTINGS_DEFAULTS.tagline),
    discoveryPromise: str(row.discoveryPromise, BRAND_SETTINGS_DEFAULTS.discoveryPromise),
    conciergeName: str(row.conciergeName, BRAND_SETTINGS_DEFAULTS.conciergeName),
    // Sólo rutas internas: no se admiten activos externos ni logos nuevos.
    logoSrc: logo.startsWith("/") ? logo : BRAND_SETTINGS_DEFAULTS.logoSrc,
  };
}

function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Lectura pública (anon). Fail-safe: ante cualquier error, predeterminados. */
export const getBrandSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrandSettings> => {
    try {
      const { data, error } = await publicClient()
        .from("platform_settings")
        .select("value")
        .eq("key", BRAND_SETTINGS_KEY)
        .eq("is_public", true)
        .maybeSingle();
      if (error || !data) return BRAND_SETTINGS_DEFAULTS;
      return normalizeBrandSettings(data.value);
    } catch {
      return BRAND_SETTINGS_DEFAULTS;
    }
  },
);

async function assertAdmin(context: {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  userId: string;
}): Promise<void> {
  const [a, b] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (a.error) throw new Error(`role_check_failed: ${a.error.message}`);
  if (b.error) throw new Error(`role_check_failed: ${b.error.message}`);
  if (!a.data && !b.data) throw new Error("forbidden");
}

/** Lectura administrativa (misma normalización, requiere admin). */
export const getBrandSettingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandSettings> => {
    await assertAdmin(context as unknown as Parameters<typeof assertAdmin>[0]);
    const { data, error } = await context.supabase
      .from("platform_settings")
      .select("value")
      .eq("key", BRAND_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeBrandSettings(data?.value);
  });

/** Escritura administrativa. No publica nada más: sólo la configuración. */
export const updateBrandSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<BrandSettings>) => normalizeBrandSettings(input))
  .handler(async ({ data, context }): Promise<BrandSettings> => {
    await assertAdmin(context as unknown as Parameters<typeof assertAdmin>[0]);
    const { error } = await context.supabase.from("platform_settings").upsert(
      {
        key: BRAND_SETTINGS_KEY,
        value:
          data as unknown as Database["public"]["Tables"]["platform_settings"]["Insert"]["value"],
        is_public: true,
        description:
          "Identidad editorial de la marca activa (nombre, lema, promesa, concierge, logo).",
        updated_by: context.userId,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return data;
  });
