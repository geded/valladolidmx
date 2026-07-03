/**
 * Sprint Reconciliación 6 · Promociones públicas destacadas.
 *
 * Reutiliza el mismo modelo que /promociones (page_compositions kind=promotion).
 * Sin backend nuevo, sin tabla nueva.
 */
import { createServerFn } from "@tanstack/react-start";

export interface PublicPromoCard {
  slug: string;
  title: string;
  description: string | null;
}

export const listFeaturedPromotions = createServerFn({ method: "GET" })
  .inputValidator((input?: { limit?: number }) => {
    const limit = typeof input?.limit === "number" && input.limit > 0 ? Math.min(input.limit, 12) : 6;
    return { limit };
  })
  .handler(async ({ data }): Promise<PublicPromoCard[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error } = await sb
      .from("page_compositions")
      .select("slug, title, description, kind, status, is_template")
      .eq("kind", "promotion")
      .eq("status", "published")
      .eq("is_template", false)
      .order("published_at", { ascending: false })
      .limit(data.limit);
    if (error) {
      console.error("[listFeaturedPromotions]", error);
      return [];
    }
    return (rows ?? []).map((r) => ({
      slug: r.slug as string,
      title: (r.title as string) ?? (r.slug as string),
      description: (r.description as string) ?? null,
    }));
  });