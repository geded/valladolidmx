/**
 * business-related.functions.ts — E2 · US-E2.1
 *
 * Related Collection para BusinessSurface. Devuelve empresas
 * hermanas publicadas en el MISMO destino:
 *   - `sameCategory`: misma categoría (excluye la empresa actual).
 *   - `sameDestinationOther`: otras categorías del mismo destino.
 *
 * Reglas (Roadmap 16.00 · Programa A/E · Carril A):
 *  - Server publishable client (anon, RLS TO anon aplica).
 *  - Sin escrituras, sin RPCs, sin acceso a datos privados del viajero.
 *  - Reutiliza el shape `MarketplaceBusinessCard`.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MarketplaceBusinessCard } from "./marketplace-reads.functions";

export interface BusinessRelatedDTO {
  sameCategory: MarketplaceBusinessCard[];
  sameDestinationOther: MarketplaceBusinessCard[];
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getBusinessRelated = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      businessId: string;
      destinationSlug: string;
      categorySlug: string;
    }) => {
      if (!data || typeof data.businessId !== "string" || data.businessId.length === 0) {
        throw new Error("invalid_business_id");
      }
      if (typeof data.destinationSlug !== "string" || data.destinationSlug.length === 0) {
        throw new Error("invalid_destination_slug");
      }
      return {
        businessId: data.businessId,
        destinationSlug: data.destinationSlug,
        categorySlug: typeof data.categorySlug === "string" ? data.categorySlug : "",
      };
    },
  )
  .handler(async ({ data }): Promise<BusinessRelatedDTO> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, verified, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .limit(120);
    if (error) throw new Error(`business_related_failed: ${error.message}`);

    const all: MarketplaceBusinessCard[] = (rows ?? []).map((row) => {
      const dest = (row.destinations as { slug?: unknown } | null)?.slug;
      const cat = (row.business_categories as { slug?: unknown } | null)?.slug;
      return {
        id: row.id,
        slug: row.slug,
        display_name: row.display_name,
        tagline: row.tagline ?? "",
        verified: Boolean(row.verified),
        destination_slug: typeof dest === "string" ? dest : "",
        category_slug: typeof cat === "string" ? cat : "",
      };
    });

    const inDestination = all.filter(
      (b) =>
        b.destination_slug === data.destinationSlug && b.id !== data.businessId,
    );
    const sameCategory = inDestination
      .filter((b) => b.category_slug === data.categorySlug)
      .slice(0, 6);
    const sameDestinationOther = inDestination
      .filter((b) => b.category_slug !== data.categorySlug)
      .slice(0, 6);

    return { sameCategory, sameDestinationOther };
  });