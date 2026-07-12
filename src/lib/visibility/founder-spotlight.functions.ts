/**
 * founder-spotlight.functions.ts — Ola 7.8 · Founder Spotlight
 *
 * Sobre-exposición manual (independiente de paquetes contratados).
 * Solo administradores pueden crear/editar/desactivar; el marketplace
 * lee la vista pública `active_founder_spotlights` para aplicar boost.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SpotlightRow {
  id: string;
  business_id: string;
  reason: string;
  headline: string | null;
  boost: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  business: { id: string; slug: string; display_name: string } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const { data: isSuper } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (!isAdmin && !isSuper) throw new Error("forbidden");
}

export const listFounderSpotlights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { onlyActive?: boolean } = {}) => ({
    onlyActive: Boolean(input?.onlyActive),
  }))
  .handler(async ({ data, context }): Promise<SpotlightRow[]> => {
    await assertAdmin(context as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (context.supabase as any)
      .from("founder_spotlights")
      .select(
        "id, business_id, reason, headline, boost, starts_at, ends_at, is_active, created_at, businesses:business_id ( id, slug, display_name )",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.onlyActive) q = q.eq("is_active", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      business_id: r.business_id,
      reason: r.reason,
      headline: r.headline,
      boost: Number(r.boost ?? 0),
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      business: r.businesses
        ? {
            id: r.businesses.id,
            slug: r.businesses.slug,
            display_name: r.businesses.display_name,
          }
        : null,
    }));
  });

export const createFounderSpotlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      business_id: string;
      reason: string;
      headline?: string | null;
      boost?: number;
      days: number;
    }) => {
      if (!input?.business_id) throw new Error("business_id required");
      if (!input?.reason || input.reason.trim().length < 3)
        throw new Error("reason required");
      const days = Math.min(Math.max(Number(input.days ?? 7), 1), 90);
      const boost = Math.min(Math.max(Number(input.boost ?? 1000), 100), 100000);
      return {
        business_id: input.business_id,
        reason: input.reason.trim(),
        headline: (input.headline ?? "").trim() || null,
        boost,
        days,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const starts = new Date();
    const ends = new Date(starts.getTime() + data.days * 24 * 3600 * 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("founder_spotlights")
      .insert({
        business_id: data.business_id,
        reason: data.reason,
        headline: data.headline,
        boost: data.boost,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_active: true,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const deactivateFounderSpotlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("founder_spotlights")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Busca empresas por nombre/slug para el picker admin. */
export const searchBusinessesForSpotlight = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q: string }) => ({
    q: String(input?.q ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.q.length < 2) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase as any)
      .from("businesses")
      .select("id, slug, display_name")
      .or(`display_name.ilike.%${data.q}%,slug.ilike.%${data.q}%`)
      .is("deleted_at", null)
      .limit(15);
    if (error) throw error;
    return (rows ?? []) as Array<{ id: string; slug: string; display_name: string }>;
  });