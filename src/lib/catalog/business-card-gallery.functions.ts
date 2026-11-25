/** On-demand gallery projection; no menu, products or full business DTO. */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MediaAssetInput } from "@/lib/media/resolve-source";
import { PUBLIC_BUSINESS_ELIGIBILITY_EQ } from "@/lib/omxds/public-eligibility";

export interface CardGalleryPhoto {
  url: string;
  alt: string | null;
  assetId?: string;
  asset?: MediaAssetInput;
}

export const getPublicBusinessCardGallery = createServerFn({ method: "GET" })
  .inputValidator((input: { businessId: string }) => {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input.businessId)) {
      throw new Error("invalid_business_id");
    }
    return { businessId: input.businessId };
  })
  .handler(async ({ data }): Promise<CardGalleryPhoto[]> => {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) return [];
    const sb = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    // Eligibility is checked as anon BEFORE privileged storage signing.
    const { data: business, error: businessError } = await sb.from("businesses")
      .select("id, slug").eq("id", data.businessId).eq("status", "published")
      .is("deleted_at", null).eq(...PUBLIC_BUSINESS_ELIGIBILITY_EQ).maybeSingle();
    if (businessError) throw new Error("gallery_unavailable");
    if (!business) return [];
    const { data: rows, error } = await sb.from("business_media")
      .select("media_assets:media_assets!inner(id, storage_bucket, storage_path, alt_text, width, height, pipeline_status, status, deleted_at)")
      .eq("business_id", business.id).eq("role", "gallery")
      .eq("media_assets.status", "published").is("media_assets.deleted_at", null)
      .order("sort_order", { ascending: true }).limit(4);
    if (error) throw new Error("gallery_unavailable");
    const assets = (rows ?? []).map(row => row.media_assets).filter(asset =>
      asset && asset.status === "published" && asset.deleted_at === null &&
      asset.storage_bucket && asset.storage_path);
    if (!assets.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signedUrlsMemo } = await import("@/lib/media/signed-url-memo");
    const urls = await signedUrlsMemo(supabaseAdmin, assets.map(asset => ({
      bucket: asset.storage_bucket, path: asset.storage_path,
    })), 3600);
    const photos: CardGalleryPhoto[] = [];
    for (const [index, asset] of assets.entries()) {
      const signed = urls[index];
      if (signed) photos.push({ url: signed, alt: asset.alt_text, assetId: asset.id });
    }
    try {
      const variants = await import("@/lib/media/variant-bundles.server");
      if (await variants.shouldServeVariantsForBusiness(business.slug)) {
        const bundles = await variants.attachReadyVariants(assets.flatMap((asset, index) => {
          const signed = urls[index];
          return signed ? [{ id: asset.id, file_url: signed, width: asset.width,
            height: asset.height, pipeline_status: asset.pipeline_status }] : [];
        }));
        for (const photo of photos) {
          const bundle = photo.assetId ? bundles[photo.assetId] : undefined;
          if (bundle) photo.asset = bundle;
        }
      }
    } catch { /* Original signed photos remain available. */ }
    return photos;
  });