/**
 * category-related.functions.ts — E2 · US-E2.3
 *
 * Related Collection para la superficie Categoría en Destino
 * (`/oriente-maya/:destino/:categoria`). Devuelve empresas
 * publicadas útiles para seguir descubriendo:
 *   - `otherCategoriesInDestination`: empresas de OTRAS categorías
 *     del MISMO destino (amplía dentro del mismo lugar).
 *   - `sameCategoryOtherDestinations`: empresas de la MISMA categoría
 *     en OTROS destinos del Oriente Maya (fallback anti-desierto y
 *     puente inter-destino).
 *
 * Reglas (Roadmap 16.00 · Programa A · Carril A):
 *  - Server publishable client (anon, RLS TO anon aplica).
 *  - Sin escrituras, sin RPCs, sin acceso a datos privados del viajero.
 *  - Reutiliza el shape `MarketplaceBusinessCard`.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MarketplaceBusinessCard } from "./marketplace-reads.functions";

export interface CategoryRelatedDTO {
  otherCategoriesInDestination: MarketplaceBusinessCard[];
  sameCategoryOtherDestinations: MarketplaceBusinessCard[];
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getCategoryRelated = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { destinationSlug: string; categorySlug: string }) => {
      if (
        !data ||
        typeof data.destinationSlug !== "string" ||
        data.destinationSlug.length === 0
      ) {
        throw new Error("invalid_destination_slug");
      }
      if (
        typeof data.categorySlug !== "string" ||
        data.categorySlug.length === 0
      ) {
        throw new Error("invalid_category_slug");
      }
      return {
        destinationSlug: data.destinationSlug,
        categorySlug: data.categorySlug,
      };
    },
  )
  .handler(async ({ data }): Promise<CategoryRelatedDTO> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, verified, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .limit(200);
    if (error) throw new Error(`category_related_failed: ${error.message}`);

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

    const otherCategoriesInDestination = all
      .filter(
        (b) =>
          b.destination_slug === data.destinationSlug &&
          b.category_slug !== data.categorySlug,
      )
      .slice(0, 6);

    const sameCategoryOtherDestinations = all
      .filter(
        (b) =>
          b.category_slug === data.categorySlug &&
          b.destination_slug !== data.destinationSlug,
      )
      .slice(0, 6);

    return { otherCategoriesInDestination, sameCategoryOtherDestinations };
  });