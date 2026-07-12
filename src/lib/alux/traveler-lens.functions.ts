/**
 * Ola A6 · Viajero Consciente — Lente del viajero para Alux.
 *
 * Server fn autenticada que expone al Concierge una proyección MÍNIMA y
 * segura del perfil M2 + cupones activos del viajero, para que el
 * flotante contextual (`aluxContextualSuggest`) pueda personalizar
 * rationales y ofrecer CTAs comerciales relevantes sin duplicar reglas
 * de acceso ni exponer PII.
 *
 * Reglas:
 *  · Sólo lee — nunca muta.
 *  · Sólo campos operativos para asesoría (idioma, país, estilo, presupuesto,
 *    dietas, accesibilidad, intereses cortos).
 *  · Cupones: sólo emitidos, aún no canjeados, vigentes.
 *  · Nada de correo, teléfono, avatar_url, handle público ni signals internos.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EmptyInput = z.object({}).optional().default({});

export interface AluxTravelerHints {
  home_country: string | null;
  preferred_language: string | null;
  travel_style: string | null;
  budget_band: string | null;
  dietary: string[];
  accessibility: string[];
  languages: string[];
  interests: string[];
  is_public: boolean;
}

export interface AluxTravelerActiveCoupon {
  id: string;
  title: string;
  code: string;
  business_id: string | null;
  business_slug: string | null;
  promotion_slug: string;
  discount_percent: number | null;
  valid_until: string;
}

export interface AluxTravelerLens {
  authenticated: true;
  hints: AluxTravelerHints;
  active_coupons: AluxTravelerActiveCoupon[];
  generated_at: string;
}

function normalizeStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    out.push(s.slice(0, 60));
    if (out.length >= max) break;
  }
  return out;
}

function extractInterests(json: unknown): string[] {
  // Interests may live as string[] or as { tags: string[] } inside jsonb.
  if (Array.isArray(json)) return normalizeStringArray(json);
  if (json && typeof json === "object") {
    const tags = (json as { tags?: unknown }).tags;
    if (Array.isArray(tags)) return normalizeStringArray(tags);
  }
  return [];
}

export const getAluxTravelerLens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmptyInput.parse(d ?? {}))
  .handler(async ({ context }): Promise<AluxTravelerLens> => {
    const supabase = context.supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: unknown) => {
            maybeSingle?: () => Promise<{ data: unknown; error: unknown }>;
            eq?: (col: string, val: unknown) => {
              gte: (col: string, val: unknown) => {
                order: (
                  col: string,
                  opts?: unknown,
                ) => {
                  limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
                };
              };
            };
          };
        };
      };
    };

    // 1) Perfil M2.
    const profileRes = await supabase
      .from("traveler_profiles")
      .select(
        "home_country, preferred_language, travel_style, budget_band, dietary, accessibility, languages, interests, is_public",
      )
      .eq("user_id", context.userId)
      .maybeSingle!();

    const p = (profileRes.data ?? {}) as {
      home_country?: string | null;
      preferred_language?: string | null;
      travel_style?: string | null;
      budget_band?: string | null;
      dietary?: unknown;
      accessibility?: unknown;
      languages?: unknown;
      interests?: unknown;
      is_public?: boolean | null;
    };

    const hints: AluxTravelerHints = {
      home_country: p.home_country ?? null,
      preferred_language: p.preferred_language ?? null,
      travel_style: p.travel_style ?? null,
      budget_band: p.budget_band ?? null,
      dietary: normalizeStringArray(p.dietary),
      accessibility: normalizeStringArray(p.accessibility),
      languages: normalizeStringArray(p.languages),
      interests: extractInterests(p.interests),
      is_public: Boolean(p.is_public),
    };

    // 2) Cupones activos (emitidos, vigentes, no canjeados) + slug del negocio.
    const nowIso = new Date().toISOString();
    const couponsRes = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: unknown) => {
            eq: (c: string, v: unknown) => {
              gte: (c: string, v: unknown) => {
                order: (
                  c: string,
                  o?: unknown,
                ) => { limit: (n: number) => Promise<{ data: unknown; error: unknown }> };
              };
            };
          };
        };
      };
    })
      .from("traveler_coupons")
      .select(
        "id, title, code, business_id, promotion_slug, discount_percent, valid_until, businesses:businesses!traveler_coupons_business_id_fkey ( slug )",
      )
      .eq("user_id", context.userId)
      .eq("status", "issued")
      .gte("valid_until", nowIso)
      .order("valid_until", { ascending: true })
      .limit(20);

    const raw = (couponsRes.data ?? []) as Array<{
      id: string;
      title: string;
      code: string;
      business_id: string | null;
      promotion_slug: string;
      discount_percent: number | null;
      valid_until: string;
      businesses?: { slug?: string | null } | null;
    }>;

    const active_coupons: AluxTravelerActiveCoupon[] = raw.map((c) => ({
      id: c.id,
      title: c.title,
      code: c.code,
      business_id: c.business_id,
      business_slug: c.businesses?.slug ?? null,
      promotion_slug: c.promotion_slug,
      discount_percent: c.discount_percent,
      valid_until: c.valid_until,
    }));

    return {
      authenticated: true,
      hints,
      active_coupons,
      generated_at: new Date().toISOString(),
    };
  });