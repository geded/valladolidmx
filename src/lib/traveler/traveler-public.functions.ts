/**
 * traveler/traveler-public.functions.ts — Épica E5 · Perfil Público del Viajero.
 *
 * Superficie pública opt-in en `/viajero/:handle`.
 *
 * Reglas:
 *  - Lectura pública vía RPC `get_public_traveler_profile` (SECURITY DEFINER)
 *    que sólo devuelve datos cuando `is_public = true`.
 *  - Verificación de handle vía RPC `check_traveler_handle_available`.
 *  - Escritura (self) vía `requireSupabaseAuth` con whitelist explícita.
 *  - Avatares: se almacenan como path relativo `<uid>/<file>` dentro del
 *    bucket privado `avatars`; los reads públicos devuelven signed URL
 *    generada en el servidor (TTL largo).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PublicTravelerProfile {
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  home_country: string | null;
  languages: string[];
  created_at: string;
}

export interface HandleAvailability {
  available: boolean;
  reason?: "invalid_length" | "invalid_format" | "reserved" | "taken";
}

export interface MyPublicProfile {
  public_handle: string | null;
  is_public: boolean;
  public_display_name: string | null;
  public_bio: string | null;
  avatar_url: string | null;
  home_country: string | null;
  languages: string[];
}

export interface UpdatePublicProfileInput {
  public_handle?: string | null;
  is_public?: boolean;
  public_display_name?: string | null;
  public_bio?: string | null;
  avatar_url?: string | null;
  home_country?: string | null;
  languages?: string[];
}

const HANDLE_RE = /^[a-z0-9_]+$/;

function clampStr(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function normHandle(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return t ? t : null;
}

function clampLangs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const raw of v) {
    const s = clampStr(raw, 8);
    if (s) out.add(s.toLowerCase());
    if (out.size >= 8) break;
  }
  return Array.from(out);
}

function pubClient() {
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

async function signAvatar(pathOrUrl: string | null): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(pathOrUrl, 60 * 60 * 24 * 7); // 7 días
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * getPublicTravelerProfile — Superficie pública `/viajero/:handle`.
 * Devuelve `null` si el perfil no existe o no está marcado como público.
 */
export const getPublicTravelerProfile = createServerFn({ method: "GET" })
  .inputValidator((input: { handle: string }) => {
    const h = normHandle(input?.handle);
    if (!h) throw new Error("invalid_handle");
    return { handle: h };
  })
  .handler(async ({ data }): Promise<PublicTravelerProfile | null> => {
    const client = await pubClient();
    const { data: row, error } = await client.rpc("get_public_traveler_profile", {
      _handle: data.handle,
    });
    if (error) throw new Error(`public_profile_read_failed: ${error.message}`);
    if (!row) return null;
    const r = row as Record<string, unknown>;
    return {
      handle: String(r.handle),
      display_name: (r.display_name as string | null) ?? null,
      bio: (r.bio as string | null) ?? null,
      avatar_url: await signAvatar((r.avatar_url as string | null) ?? null),
      home_country: (r.home_country as string | null) ?? null,
      languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
      created_at: String(r.created_at),
    };
  });

/**
 * checkHandleAvailability — Verifica disponibilidad y validez del handle.
 * Pública (usada durante el flujo de setup). Sin efectos.
 */
export const checkHandleAvailability = createServerFn({ method: "GET" })
  .inputValidator((input: { handle: string }) => ({
    handle: normHandle(input?.handle) ?? "",
  }))
  .handler(async ({ data }): Promise<HandleAvailability> => {
    if (!data.handle) return { available: false, reason: "invalid_length" };
    const client = await pubClient();
    const { data: row, error } = await client.rpc("check_traveler_handle_available", {
      _handle: data.handle,
    });
    if (error) throw new Error(`handle_check_failed: ${error.message}`);
    const r = (row ?? {}) as { available?: boolean; reason?: HandleAvailability["reason"] };
    return { available: Boolean(r.available), reason: r.reason };
  });

/**
 * getMyPublicProfile — Lee la configuración del perfil público del viajero
 * autenticado (para el panel /cuenta/perfil-publico). Devuelve valores
 * apagados por defecto si aún no hay registro.
 */
export const getMyPublicProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPublicProfile> => {
    const { data, error } = await context.supabase
      .from("traveler_profiles")
      .select(
        "public_handle, is_public, public_display_name, public_bio, avatar_url, home_country, languages",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(`my_public_profile_read_failed: ${error.message}`);
    const row = (data ?? {}) as Record<string, unknown>;

    // Fallback: rellenar desde `profiles` (datos personales) para no
    // volver a pedirle al viajero lo que ya nos dio en su alta o en
    // /cuenta/perfil. Sólo se usa como sugerencia visible: al guardar,
    // los valores efectivos se persisten en `traveler_profiles`.
    const { data: personal } = await context.supabase
      .from("profiles")
      .select("first_name, last_name, display_name, avatar_url, country, preferred_language")
      .eq("user_id", context.userId)
      .maybeSingle();
    const p = (personal ?? {}) as Record<string, unknown>;

    const fullName = [p.first_name, p.last_name]
      .filter((s) => typeof s === "string" && (s as string).trim())
      .join(" ")
      .trim();
    const suggestedName =
      fullName || ((p.display_name as string | null) ?? null) || null;

    const rawLangs = Array.isArray(row.languages) ? (row.languages as string[]) : [];
    const suggestedLangs =
      rawLangs.length > 0
        ? rawLangs
        : p.preferred_language
          ? [String(p.preferred_language)]
          : [];

    return {
      public_handle: (row.public_handle as string | null) ?? null,
      is_public: Boolean(row.is_public),
      public_display_name:
        ((row.public_display_name as string | null) ?? null) || suggestedName,
      public_bio: (row.public_bio as string | null) ?? null,
      avatar_url: await signAvatar(
        ((row.avatar_url as string | null) ?? null) ||
          ((p.avatar_url as string | null) ?? null),
      ),
      home_country:
        ((row.home_country as string | null) ?? null) ||
        ((p.country as string | null) ?? null),
      languages: suggestedLangs,
    };
  });

/**
 * updateMyPublicProfile — Guarda/actualiza la configuración del perfil
 * público. Whitelist estricta; el trigger DB valida handle final.
 */
export const updateMyPublicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdatePublicProfileInput | undefined) => {
    const v = input ?? {};
    const handle = normHandle(v.public_handle);
    if (handle !== null) {
      if (handle.length < 3 || handle.length > 24 || !HANDLE_RE.test(handle)) {
        throw new Error("invalid_handle");
      }
    }
    return {
      public_handle: handle,
      is_public: typeof v.is_public === "boolean" ? v.is_public : undefined,
      public_display_name: clampStr(v.public_display_name, 60),
      public_bio: clampStr(v.public_bio, 200),
      avatar_url: clampStr(v.avatar_url, 500),
      home_country: clampStr(v.home_country, 60),
      languages: v.languages !== undefined ? clampLangs(v.languages) : undefined,
    };
  })
  .handler(async ({ context, data }): Promise<MyPublicProfile> => {
    // is_public=true requiere handle previo o en el mismo update.
    if (data.is_public === true) {
      let handle = data.public_handle;
      if (!handle) {
        const { data: existing } = await context.supabase
          .from("traveler_profiles")
          .select("public_handle")
          .eq("user_id", context.userId)
          .maybeSingle();
        handle = (existing?.public_handle as string | null) ?? null;
      }
      if (!handle) throw new Error("handle_required_to_publish");
    }

    const payload = {
      user_id: context.userId,
      ...(data.public_handle !== undefined ? { public_handle: data.public_handle } : {}),
      ...(data.is_public !== undefined ? { is_public: data.is_public } : {}),
      ...(data.public_display_name !== undefined
        ? { public_display_name: data.public_display_name }
        : {}),
      ...(data.public_bio !== undefined ? { public_bio: data.public_bio } : {}),
      ...(data.avatar_url !== undefined ? { avatar_url: data.avatar_url } : {}),
      ...(data.home_country !== undefined ? { home_country: data.home_country } : {}),
      ...(data.languages !== undefined ? { languages: data.languages } : {}),
    };

    const { data: row, error } = await context.supabase
      .from("traveler_profiles")
      .upsert(payload as never, { onConflict: "user_id" })
      .select(
        "public_handle, is_public, public_display_name, public_bio, avatar_url, home_country, languages",
      )
      .single();
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("reserved_handle")) throw new Error("reserved_handle");
      if (msg.includes("invalid_handle")) throw new Error("invalid_handle");
      if (msg.includes("duplicate key")) throw new Error("handle_taken");
      throw new Error(`my_public_profile_write_failed: ${error.message}`);
    }
    const r = row as Record<string, unknown>;
    return {
      public_handle: (r.public_handle as string | null) ?? null,
      is_public: Boolean(r.is_public),
      public_display_name: (r.public_display_name as string | null) ?? null,
      public_bio: (r.public_bio as string | null) ?? null,
      avatar_url: await signAvatar((r.avatar_url as string | null) ?? null),
      home_country: (r.home_country as string | null) ?? null,
      languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
    };
  });