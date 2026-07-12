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

/**
 * Ola A15 · Snapshot compacto del plan activo del viajero.
 * Sólo datos útiles para el Concierge (fechas, compañía, guardados,
 * canjeados). Nada de PII ni notas privadas.
 */
export interface AluxTravelerPlanItem {
  kind: "destination" | "business" | "product" | "event" | "note";
  slug: string | null;
  title: string | null;
}

export interface AluxTravelerPlanSnapshot {
  plan_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  party_size: number | null;
  days_remaining: number | null;
  saved_items: AluxTravelerPlanItem[];
  redeemed_business_slugs: string[];
  item_count: number;
}

export interface AluxTravelerLens {
  authenticated: true;
  hints: AluxTravelerHints;
  active_coupons: AluxTravelerActiveCoupon[];
  /** Ola A15 — Plan activo (si existe). */
  plan: AluxTravelerPlanSnapshot | null;
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

    // 3) A15 · Snapshot del plan activo (best-effort, no rompe si falla).
    let plan: AluxTravelerPlanSnapshot | null = null;
    try {
      const anySb = context.supabase as unknown as {
        rpc: (name: string) => Promise<{ data: unknown; error: unknown }>;
        from: (t: string) => {
          select: (c: string) => {
            eq: (c: string, v: unknown) => {
              maybeSingle?: () => Promise<{ data: unknown; error: unknown }>;
              order?: (c: string, o?: unknown) => {
                limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      };
      const ensured = await anySb.rpc("travel_plan_ensure_active");
      const planId = ensured.data as string | null;
      if (planId) {
        const planRes = await anySb
          .from("travel_plans")
          .select("id, title, start_date, end_date, party_size")
          .eq("id", planId)
          .maybeSingle!();
        const p = planRes.data as
          | {
              id: string;
              title: string;
              start_date: string | null;
              end_date: string | null;
              party_size: number | null;
            }
          | null;
        if (p) {
          const itemsRes = await anySb
            .from("travel_plan_items")
            .select("item_kind, snapshot")
            .eq("plan_id", p.id)
            .order!("position", { ascending: true })
            .limit(30);
          const rawItems = (itemsRes.data ?? []) as Array<{
            item_kind: string;
            snapshot: { title?: string | null; slug?: string | null } | null;
          }>;
          const saved_items: AluxTravelerPlanItem[] = rawItems.map((r) => ({
            kind: (r.item_kind as AluxTravelerPlanItem["kind"]) ?? "note",
            slug: r.snapshot?.slug ?? null,
            title: r.snapshot?.title ?? null,
          }));

          let days_remaining: number | null = null;
          if (p.start_date) {
            const start = Date.parse(p.start_date + "T00:00:00Z");
            if (Number.isFinite(start)) {
              const diff = Math.round((start - Date.now()) / 86_400_000);
              days_remaining = diff;
            }
          }

          plan = {
            plan_id: p.id,
            title: p.title,
            start_date: p.start_date,
            end_date: p.end_date,
            party_size: p.party_size,
            days_remaining,
            saved_items,
            redeemed_business_slugs: [],
            item_count: saved_items.length,
          };
        }
      }

      // Canjeados: negocios donde el viajero YA usó cupón.
      const redeemedRes = await (context.supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (c: string, v: unknown) => {
              eq: (c: string, v: unknown) => {
                limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      })
        .from("traveler_coupons")
        .select("businesses:businesses!traveler_coupons_business_id_fkey ( slug )")
        .eq("user_id", context.userId)
        .eq("status", "redeemed")
        .limit(20);
      const redeemedRaw = (redeemedRes.data ?? []) as Array<{
        businesses?: { slug?: string | null } | null;
      }>;
      const redeemedSlugs = redeemedRaw
        .map((r) => r.businesses?.slug ?? null)
        .filter((s): s is string => Boolean(s));
      if (plan) plan.redeemed_business_slugs = Array.from(new Set(redeemedSlugs)).slice(0, 20);
    } catch (error) {
      console.warn("[alux.traveler-lens] plan snapshot failed:", error);
    }

    return {
      authenticated: true,
      hints,
      active_coupons,
      plan,
      generated_at: new Date().toISOString(),
    };
  });