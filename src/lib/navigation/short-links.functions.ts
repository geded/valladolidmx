/**
 * Resolución pública de enlaces cortos de empresa. Sólo lee empresas
 * publicadas y devuelve su ruta canónica territorial; nunca datos privados.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolveCanonicalPath } from "./canonical-paths";
import { shortCategoryMatches } from "./short-links";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;

export const resolveBusinessShortLink = createServerFn({ method: "GET" })
  .inputValidator((input: { categoria: string; empresa: string }) => {
    const categoria = String(input?.categoria ?? "").trim().toLowerCase();
    const empresa = String(input?.empresa ?? "").trim().toLowerCase();
    if (!SLUG_RE.test(categoria) || !SLUG_RE.test(empresa)) throw new Error("invalid_short_link");
    return { categoria, empresa };
  })
  .handler(async ({ data }): Promise<string | null> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    const sb = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: biz } = await sb
      .from("businesses")
      .select(
        "slug, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("slug", data.empresa)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (!biz) return null;
    const destination = (biz.destinations as { slug?: string } | null)?.slug;
    const category = (biz.business_categories as { slug?: string } | null)?.slug;
    if (!destination || !category || !shortCategoryMatches(data.categoria, category)) return null;
    return resolveCanonicalPath({
      kind: "business",
      slug: biz.slug as string,
      category,
      destination,
    });
  });
