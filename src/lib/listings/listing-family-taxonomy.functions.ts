/**
 * Lote 3C · Taxonomía administrable de familias de listado.
 *
 * Autoridad CMS-first: la pertenencia de una categoría de negocio a una
 * familia de listado turístico (`hoteles`, `restaurantes`, `experiencias`,
 * `casas-de-vacaciones`) se administra en
 * `business_categories.listing_family_key` — nunca en constantes de código.
 *
 * El contrato `listing-public-contract.ts` conserva sus slugs declarados
 * únicamente como fallback fail-safe cuando la lectura no está disponible.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isListingFamilyId, type ListingFamilyId } from "./listing-public-contract";

export type ListingFamilyTaxonomy = Partial<Record<ListingFamilyId, string[]>>;

/**
 * Lote 3C · corrección final — `available` distingue "el CMS no declara
 * membresía" (lista vacía autoritativa) de "no se pudo leer el CMS"
 * (fallback fail-safe). Un fallback nunca inventa membresía de familia.
 */
export interface ListingFamilyTaxonomyResult {
  readonly available: boolean;
  readonly taxonomy: ListingFamilyTaxonomy;
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getListingFamilyTaxonomy = createServerFn({ method: "GET" }).handler(
  async (): Promise<ListingFamilyTaxonomyResult> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("business_categories")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columna aditiva Lote 3C
      .select("slug, listing_family_key" as any)
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(200);
    if (error || !data) return { available: false, taxonomy: {} };
    const taxonomy: ListingFamilyTaxonomy = {};
    for (const raw of data as unknown as Array<Record<string, unknown>>) {
      const family = raw.listing_family_key;
      const slug = raw.slug;
      if (!isListingFamilyId(family) || typeof slug !== "string" || !slug.trim()) continue;
      (taxonomy[family] ??= []).push(slug.trim().toLowerCase());
    }
    return { available: true, taxonomy };
  },
);
