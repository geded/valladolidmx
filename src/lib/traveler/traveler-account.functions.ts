/**
 * traveler/traveler-account.functions.ts — Ola 4 · Etapa 3.
 *
 * Cuenta del viajero: lectura/escritura del propio `traveler_profiles`.
 * Reglas (Plan 14.40 §4 Etapa 3):
 *  - `requireSupabaseAuth` obligatorio en toda operación.
 *  - Whitelist explícita de campos (sin tocar `id`, `user_id`,
 *    `created_at`, `updated_at`).
 *  - Sin cambios a RLS ni al modelo de dominio.
 *  - Sin acceso a Portal / CMS / Marketplace.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TravelerProfile {
  user_id: string;
  travel_style: string | null;
  budget_range: string | null;
  interests: string[];
  preferred_destinations: string[];
  preferred_language: string | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  trip_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TravelerProfileInput {
  travel_style?: string | null;
  budget_range?: string | null;
  interests?: string[];
  preferred_destinations?: string[];
  preferred_language?: string | null;
  dietary_restrictions?: string | null;
  accessibility_needs?: string | null;
  trip_context?: Record<string, unknown>;
}

const TRAVEL_STYLES = new Set([
  "relax",
  "aventura",
  "cultura",
  "gastronomia",
  "naturaleza",
  "familiar",
  "negocios",
  "romantico",
]);
const BUDGET_RANGES = new Set(["economico", "medio", "premium", "lujo"]);
const LANGS = new Set(["es", "en", "fr", "de", "it", "pt"]);

function clampStr(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0) return null;
  if (t.length > max) return t.slice(0, max);
  return t;
}

function clampList(v: unknown, max = 24, maxItemLen = 80): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  for (const raw of v) {
    const s = clampStr(raw, maxItemLen);
    if (s) seen.add(s);
    if (seen.size >= max) break;
  }
  return Array.from(seen);
}

function clampTripContext(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const allowed = ["party_size", "travel_window", "notes"] as const;
  for (const key of allowed) {
    if (src[key] === undefined) continue;
    const value = src[key];
    if (key === "party_size") {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n) && n >= 1 && n <= 50) out[key] = Math.floor(n);
    } else if (key === "travel_window") {
      const s = clampStr(value, 80);
      if (s) out[key] = s;
    } else if (key === "notes") {
      const s = clampStr(value, 600);
      if (s) out[key] = s;
    }
  }
  return out;
}

function mapRow(row: Record<string, unknown>): TravelerProfile {
  return {
    user_id: String(row.user_id),
    travel_style: (row.travel_style as string | null) ?? null,
    budget_range: (row.budget_range as string | null) ?? null,
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    preferred_destinations: Array.isArray(row.preferred_destinations)
      ? (row.preferred_destinations as string[])
      : [],
    preferred_language: (row.preferred_language as string | null) ?? null,
    dietary_restrictions: (row.dietary_restrictions as string | null) ?? null,
    accessibility_needs: (row.accessibility_needs as string | null) ?? null,
    trip_context:
      row.trip_context && typeof row.trip_context === "object"
        ? (row.trip_context as Record<string, unknown>)
        : {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const SELECT_COLS =
  "user_id, travel_style, budget_range, interests, preferred_destinations, preferred_language, dietary_restrictions, accessibility_needs, trip_context, created_at, updated_at";

/**
 * getMyTravelerProfile — Lee el perfil del viajero autenticado.
 * Devuelve `null` si aún no existe (no se crea silenciosamente).
 */
export const getMyTravelerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TravelerProfile | null> => {
    const { data, error } = await context.supabase
      .from("traveler_profiles")
      .select(SELECT_COLS)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(`traveler_profile_read_failed: ${error.message}`);
    return data ? mapRow(data as Record<string, unknown>) : null;
  });

/**
 * upsertMyTravelerProfile — Crea o actualiza el perfil del viajero
 * autenticado. Whitelist estricta; nunca toca `user_id` ni timestamps.
 */
export const upsertMyTravelerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TravelerProfileInput | undefined) => {
    const v = input ?? {};
    const style = clampStr(v.travel_style, 32);
    const budget = clampStr(v.budget_range, 32);
    const lang = clampStr(v.preferred_language, 8);
    return {
      travel_style: style && TRAVEL_STYLES.has(style) ? style : null,
      budget_range: budget && BUDGET_RANGES.has(budget) ? budget : null,
      interests: clampList(v.interests, 16, 60),
      preferred_destinations: clampList(v.preferred_destinations, 16, 80),
      preferred_language: lang && LANGS.has(lang) ? lang : null,
      dietary_restrictions: clampStr(v.dietary_restrictions, 300),
      accessibility_needs: clampStr(v.accessibility_needs, 300),
      trip_context: clampTripContext(v.trip_context),
    };
  })
  .handler(async ({ context, data }): Promise<TravelerProfile> => {
    const payload = {
      user_id: context.userId,
      travel_style: data.travel_style,
      budget_range: data.budget_range,
      interests: data.interests,
      preferred_destinations: data.preferred_destinations,
      preferred_language: data.preferred_language,
      dietary_restrictions: data.dietary_restrictions,
      accessibility_needs: data.accessibility_needs,
      trip_context: data.trip_context,
    };
    const { data: row, error } = await context.supabase
      .from("traveler_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(`traveler_profile_write_failed: ${error.message}`);
    return mapRow(row as Record<string, unknown>);
  });