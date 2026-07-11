/**
 * Ola 6.2 · Reviewer Stats & Pending Reviews.
 *
 * Devuelve el conteo de reseñas verificadas del viajero autenticado (para
 * gamificación y badge "Reseñador verificado") y la lista de canjes sin
 * reseña (para el banner in-app). También expone una versión pública para
 * mostrar el badge en /viajero/:handle.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REVIEWER_VERIFIED_THRESHOLD = 3;

export interface PendingReview {
  couponId: string;
  businessId: string;
  businessSlug: string;
  businessName: string;
  redeemedAt: string;
}

export interface MyReviewerStats {
  verifiedCount: number;
  isReviewerVerified: boolean;
  pending: PendingReview[];
}

export interface PublicReviewerStats {
  verifiedCount: number;
  isReviewerVerified: boolean;
}

function pubClient() {
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}

export const getMyReviewerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyReviewerStats> => {
    const { supabase, userId } = context;

    // Conteo de reseñas verificadas del propio usuario.
    const { count: verifiedCount, error: countErr } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", userId)
      .eq("status", "published")
      .eq("verified_source", "verified_redemption")
      .is("deleted_at", null);
    if (countErr) throw new Error(`reviewer_stats_count_failed: ${countErr.message}`);
    const vCount = verifiedCount ?? 0;

    // Canjes con status='redeemed' y sin reseña del usuario para ese negocio.
    const { data: coupons, error: cErr } = await supabase
      .from("traveler_coupons")
      .select("id, business_id, redeemed_at")
      .eq("user_id", userId)
      .eq("status", "redeemed")
      .order("redeemed_at", { ascending: false })
      .limit(20);
    if (cErr) throw new Error(`reviewer_stats_coupons_failed: ${cErr.message}`);
    const rows = (coupons ?? []) as Array<{
      id: string;
      business_id: string;
      redeemed_at: string;
    }>;

    if (rows.length === 0) {
      return {
        verifiedCount: vCount,
        isReviewerVerified: vCount >= REVIEWER_VERIFIED_THRESHOLD,
        pending: [],
      };
    }

    const businessIds = Array.from(new Set(rows.map((r) => r.business_id)));

    // Reseñas ya existentes del usuario para esos negocios (cualquier status).
    const { data: existing, error: eErr } = await supabase
      .from("reviews")
      .select("subject_id")
      .eq("author_user_id", userId)
      .eq("subject_kind", "business")
      .in("subject_id", businessIds)
      .is("deleted_at", null);
    if (eErr) throw new Error(`reviewer_stats_existing_failed: ${eErr.message}`);
    const reviewedIds = new Set(
      ((existing ?? []) as Array<{ subject_id: string }>).map((r) => r.subject_id),
    );

    const pendingBusinessIds = businessIds.filter((b) => !reviewedIds.has(b));
    if (pendingBusinessIds.length === 0) {
      return {
        verifiedCount: vCount,
        isReviewerVerified: vCount >= REVIEWER_VERIFIED_THRESHOLD,
        pending: [],
      };
    }

    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, slug, display_name, legal_name")
      .in("id", pendingBusinessIds);
    if (bErr) throw new Error(`reviewer_stats_business_failed: ${bErr.message}`);
    const bMap = new Map<string, { slug: string; name: string }>();
    for (const b of (biz ?? []) as Array<{
      id: string;
      slug: string | null;
      display_name: string | null;
      legal_name: string | null;
    }>) {
      if (!b.slug) continue;
      bMap.set(b.id, { slug: b.slug, name: b.display_name || b.legal_name || "Experiencia" });
    }

    // Deduplicar por negocio: sólo el canje más reciente.
    const seen = new Set<string>();
    const pending: PendingReview[] = [];
    for (const row of rows) {
      if (reviewedIds.has(row.business_id)) continue;
      if (seen.has(row.business_id)) continue;
      const m = bMap.get(row.business_id);
      if (!m) continue;
      seen.add(row.business_id);
      pending.push({
        couponId: row.id,
        businessId: row.business_id,
        businessSlug: m.slug,
        businessName: m.name,
        redeemedAt: row.redeemed_at,
      });
    }

    return {
      verifiedCount: vCount,
      isReviewerVerified: vCount >= REVIEWER_VERIFIED_THRESHOLD,
      pending,
    };
  });

export const getPublicReviewerStats = createServerFn({ method: "GET" })
  .inputValidator((input: { handle: string }) => {
    const h = typeof input?.handle === "string" ? input.handle.trim().toLowerCase() : "";
    if (!h) throw new Error("invalid_handle");
    return { handle: h };
  })
  .handler(async ({ data }): Promise<PublicReviewerStats> => {
    const client = await pubClient();
    // Resolver user_id vía RPC pública (no exponemos traveler_profiles).
    const { data: profileRow } = await client.rpc("get_public_traveler_profile", {
      _handle: data.handle,
    });
    if (!profileRow) return { verifiedCount: 0, isReviewerVerified: false };

    // La RPC no devuelve user_id (por diseño). Usamos service role
    // sólo para el conteo agregado — nunca devolvemos user_id al cliente.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tp } = await supabaseAdmin
      .from("traveler_profiles")
      .select("user_id")
      .eq("public_handle", data.handle)
      .eq("is_public", true)
      .maybeSingle();
    if (!tp?.user_id) return { verifiedCount: 0, isReviewerVerified: false };

    const { count } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", tp.user_id)
      .eq("status", "published")
      .eq("verified_source", "verified_redemption")
      .is("deleted_at", null);
    const c = count ?? 0;
    return { verifiedCount: c, isReviewerVerified: c >= REVIEWER_VERIFIED_THRESHOLD };
  });
