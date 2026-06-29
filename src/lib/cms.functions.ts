/**
 * cms.functions.ts — Server functions de lectura pública del CMS (Bloque D / 13.4).
 *
 * Usa el cliente publishable (sin sesión) para SSR/prerender de rutas públicas.
 * Solo proyecta columnas seguras y filtra `status = 'published'` + `deleted_at IS NULL`,
 * apoyándose en las políticas RLS definidas en la migración phase1_blockD_cms_governance.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export const listPublishedArticles = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; destinationId?: string } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("articles")
      .select("id, slug, title, excerpt, locale, published_at, cover_media_id, destination_id, tags")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(data.limit ?? 12);
    if (data.destinationId) q = q.eq("destination_id", data.destinationId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("articles")
      .select("id, slug, title, excerpt, body, locale, published_at, cover_media_id, destination_id, tags")
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const listUpcomingEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("events")
      .select("id, slug, title, summary, starts_at, ends_at, venue_name, cover_media_id, destination_id, is_free, external_url")
      .eq("status", "published")
      .is("deleted_at", null)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(data.limit ?? 12);
    if (error) throw error;
    return rows ?? [];
  });

export const listActiveBanners = createServerFn({ method: "GET" })
  .inputValidator((data: { placement?: string } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await sb
      .from("banners")
      .select("id, slug, title, subtitle, cta_label, cta_url, placement, position, palette, cover_media_id, starts_at, ends_at")
      .eq("status", "published")
      .eq("placement", data.placement ?? "home")
      .is("deleted_at", null)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("position", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const listFaqs = createServerFn({ method: "GET" })
  .inputValidator((data: { category?: string } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("faqs")
      .select("id, question, answer, category, position, locale")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getPageBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("pages")
      .select("id, slug, title, body, blocks, locale, cover_media_id, published_at")
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const listPublishedRoutes = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("editorial_routes")
      .select("id, slug, name, summary, duration_days, palette, cover_media_id, destination_ids")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(data.limit ?? 12);
    if (error) throw error;
    return rows ?? [];
  });

export const getSeoMetadata = createServerFn({ method: "GET" })
  .inputValidator((data: { entityKind: string; entityId: string; locale?: string }) => data)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("seo_metadata")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("slug, meta_title, meta_description, canonical_url, og_title, og_description, og_image_url, twitter_card, noindex, json_ld") as any;
    if (error) throw error;
    const rows = (row ?? []) as Array<{
      slug: string | null;
      meta_title: string | null;
      meta_description: string | null;
      canonical_url: string | null;
      og_title: string | null;
      og_description: string | null;
      og_image_url: string | null;
      twitter_card: string | null;
      noindex: boolean;
      json_ld: unknown;
    }>;
    void data;
    return rows[0] ?? null;
  });