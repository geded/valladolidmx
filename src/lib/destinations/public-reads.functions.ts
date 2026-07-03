/**
 * Public reads for /oriente-maya/{slug} destination page.
 * Reads destinations enriched in DB (Fase 4.1b) and signs the hero image
 * from the private `demo-media` bucket. Falls back to null on miss so the
 * caller can use the static mock.
 */
import { createServerFn } from "@tanstack/react-start";

export interface PublicDestinationDTO {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  highlights: string[];
  hero_palette: "territorio" | "selva" | "cenote" | "atardecer" | null;
  hero_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const getPublicDestinationBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(input.slug)) {
      throw new Error("Invalid slug");
    }
    return input;
  })
  .handler(async ({ data }): Promise<PublicDestinationDTO | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const publishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: row, error } = await sb
      .from("destinations")
      .select(
        "slug, name, tagline, description, highlights, hero_palette, latitude, longitude, hero_media_id, media_assets:hero_media_id ( storage_bucket, storage_path )",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error("[getPublicDestinationBySlug] read error", error);
      return null;
    }
    if (!row) return null;

    let hero_url: string | null = null;
    const media = (row as unknown as {
      media_assets?: { storage_bucket: string; storage_path: string } | null;
    }).media_assets;
    if (media?.storage_bucket && media?.storage_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from(media.storage_bucket)
        .createSignedUrl(media.storage_path, 60 * 60);
      if (signErr) console.error("[getPublicDestinationBySlug] sign error", signErr);
      hero_url = signed?.signedUrl ?? null;
    }

    return {
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? null,
      description: row.description ?? null,
      highlights: Array.isArray(row.highlights) ? (row.highlights as string[]) : [],
      hero_palette: (row.hero_palette as PublicDestinationDTO["hero_palette"]) ?? null,
      hero_url,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    };
  });
