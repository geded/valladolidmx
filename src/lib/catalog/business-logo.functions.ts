/**
 * business-logo.functions.ts — Lectura pública del logotipo de la empresa.
 *
 * Delta mínimo (identidad visual): las landings del Experience Builder
 * necesitan mostrar el logotipo acreditado de la empresa de origen. La
 * fuente única sigue siendo `business_media` con `role='logo'`; aquí sólo
 * se firma la URL para render público. Fail-closed: empresa no publicada,
 * sin logo o con medio eliminado ⇒ `null` (jamás un placeholder de marca).
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getPublicBusinessLogo = createServerFn({ method: "GET" })
  .inputValidator((data: { businessId: string }) => ({
    businessId: String(data?.businessId ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.businessId) return { url: null, name: null } as const;
    const supabase = publicClient();
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, display_name, status")
      .eq("id", data.businessId)
      .eq("status", "published")
      .maybeSingle();
    if (!biz) return { url: null, name: null } as const;

    const { data: logoRow } = await supabase
      .from("business_media")
      .select("media_assets:media_assets ( storage_bucket, storage_path, deleted_at )")
      .eq("business_id", data.businessId)
      .eq("role", "logo")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const asset = (
      logoRow as {
        media_assets?: {
          storage_bucket?: string;
          storage_path?: string;
          deleted_at?: string | null;
        } | null;
      } | null
    )?.media_assets;
    if (!asset?.storage_bucket || !asset.storage_path || asset.deleted_at) {
      return { url: null, name: biz.display_name ?? null } as const;
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, 3600);
      return { url: signed?.signedUrl ?? null, name: biz.display_name ?? null } as const;
    } catch {
      return { url: null, name: biz.display_name ?? null } as const;
    }
  });
