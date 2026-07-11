/**
 * Ola 6 · Reseña post-canje — resolver público de negocio por slug.
 * Uso: página `/resenar/negocio/:slug` (abierta desde el email de canje).
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface BusinessBySlug {
  id: string;
  display_name: string;
  slug: string;
}

export const resolveBusinessBySlug = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => {
    const d = (raw ?? {}) as { slug?: unknown };
    const slug = String(d.slug ?? "").trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) {
      throw new Error("invalid_slug");
    }
    return { slug };
  })
  .handler(async ({ data }): Promise<BusinessBySlug | null> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("supabase_env_missing");
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: row, error } = await supabase
      .from("businesses")
      .select("id, display_name, slug")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as BusinessBySlug | null) ?? null;
  });