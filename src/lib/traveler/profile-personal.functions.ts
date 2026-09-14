/**
 * traveler/profile-personal.functions.ts
 *
 * Datos personales del viajero autenticado (tabla `profiles`).
 * Whitelist estricta: nunca toca `role`, `status`, `active_mode`,
 * `created_at`, `id`, `user_id`. Sólo el propio `auth.uid()` es accesible.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PersonalProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  country: string | null;
  preferred_language: string;
  whatsapp_contact_consent: boolean;
  whatsapp_contact_consented_at: string | null;
}

export interface PersonalProfileInput {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  preferred_language?: string | null;
}

const LANGS = new Set(["es", "en", "fr", "de", "it", "pt"]);

function clampStr(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function buildDisplayName(first: string | null, last: string | null): string | null {
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined || null;
}

const SELECT_COLS =
  "user_id, first_name, last_name, display_name, email, phone, avatar_url, country, preferred_language";

export const getMyPersonalProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonalProfile | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(SELECT_COLS)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(`personal_profile_read_failed: ${error.message}`);
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const { data: traveler } = await context.supabase
      .from("traveler_profiles")
      .select("whatsapp_contact_consent, whatsapp_contact_consented_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      user_id: String(row.user_id),
      first_name: (row.first_name as string | null) ?? null,
      last_name: (row.last_name as string | null) ?? null,
      display_name: (row.display_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      country: (row.country as string | null) ?? null,
      preferred_language: (row.preferred_language as string | null) ?? "es",
      whatsapp_contact_consent: Boolean(traveler?.whatsapp_contact_consent),
      whatsapp_contact_consented_at: traveler?.whatsapp_contact_consented_at ?? null,
    };
  });

export const upsertMyPersonalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PersonalProfileInput | undefined) => {
    const v = input ?? {};
    const lang = clampStr(v.preferred_language, 8);
    const { data: traveler } = await context.supabase
      .from("traveler_profiles")
      .select("whatsapp_contact_consent, whatsapp_contact_consented_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      first_name: clampStr(v.first_name, 60),
      last_name: clampStr(v.last_name, 60),
      phone: clampStr(v.phone, 32),
      avatar_url: clampStr(v.avatar_url, 2000),
      country: clampStr(v.country, 60),
      preferred_language: lang && LANGS.has(lang) ? lang : null,
    };
  })
  .handler(async ({ context, data }): Promise<PersonalProfile> => {
    const patch = {
      first_name: data.first_name,
      last_name: data.last_name,
      display_name: buildDisplayName(data.first_name, data.last_name),
      phone: data.phone,
      avatar_url: data.avatar_url,
      country: data.country,
      ...(data.preferred_language ? { preferred_language: data.preferred_language } : {}),
    };
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("user_id", context.userId)
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(`personal_profile_write_failed: ${error.message}`);
    const r = row as Record<string, unknown>;
    return {
      user_id: String(r.user_id),
      first_name: (r.first_name as string | null) ?? null,
      last_name: (r.last_name as string | null) ?? null,
      display_name: (r.display_name as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      phone: (r.phone as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      preferred_language: (r.preferred_language as string | null) ?? "es",
      whatsapp_contact_consent: Boolean(traveler?.whatsapp_contact_consent),
      whatsapp_contact_consented_at: traveler?.whatsapp_contact_consented_at ?? null,
    };
  });

const ConciergeContactInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(32)
    .regex(/^\+?[0-9 ()-]{8,32}$/),
  whatsappConsent: z.literal(true),
});

/** Guarda únicamente los datos necesarios para solicitar atención Concierge. */
export const saveMyConciergeContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConciergeContactInput.parse(input))
  .handler(async ({ context, data }) => {
    const parts = data.name.split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? data.name;
    const lastName = parts.join(" ") || null;
    const { data: current, error: readError } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("user_id", context.userId)
      .single();
    if (readError || !current?.email) throw new Error("concierge_contact_email_required");

    const { error: profileError } = await context.supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        display_name: data.name,
        phone: data.phone,
      })
      .eq("user_id", context.userId);
    if (profileError) throw new Error(`concierge_contact_write_failed: ${profileError.message}`);

    const { error: consentError } = await context.supabase.from("traveler_profiles").upsert(
      {
        user_id: context.userId,
        whatsapp_contact_consent: data.whatsappConsent,
      },
      { onConflict: "user_id" },
    );
    if (consentError) throw new Error(`concierge_consent_write_failed: ${consentError.message}`);
    return { ok: true as const };
  });
