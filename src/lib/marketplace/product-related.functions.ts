/**
 * product-related.functions.ts — E2 · US-E2.2
 *
 * Related Collection para ProductSurface. Devuelve productos
 * hermanos publicados en el MISMO destino y MISMA categoría de la
 * empresa oferente, excluyendo:
 *   - el producto actual
 *   - la empresa actual (los productos de la MISMA empresa se
 *     resuelven vía `MarketplaceProductDetail.related`, ya cargado
 *     por el loader; evitamos duplicar consulta).
 *
 * Reglas (Roadmap 16.00 · Programa A + E · Carril A):
 *  - Server publishable client (anon, RLS TO anon).
 *  - Sin escrituras, sin RPCs privadas, sin PII.
 *  - Reutiliza el shape `MarketplaceProductCard`.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MarketplaceProductCard } from "./marketplace-reads.functions";

export interface ProductRelatedDTO {
  sameCategoryInDestination: MarketplaceProductCard[];
  /** Fallback: otros productos del mismo destino (cualquier categoría),
   *  excluyendo la empresa actual y los ya incluidos en `sameCategoryInDestination`.
   *  Útil cuando la matriz destino×categoría es escasa. */
  otherInDestination: MarketplaceProductCard[];
}

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getProductRelated = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      productId: string;
      businessId: string;
      destinationSlug: string;
      categorySlug: string;
    }) => {
      if (!data || typeof data.productId !== "string" || data.productId.length === 0) {
        throw new Error("invalid_product_id");
      }
      if (typeof data.businessId !== "string" || data.businessId.length === 0) {
        throw new Error("invalid_business_id");
      }
      if (typeof data.destinationSlug !== "string" || data.destinationSlug.length === 0) {
        throw new Error("invalid_destination_slug");
      }
      return {
        productId: data.productId,
        businessId: data.businessId,
        destinationSlug: data.destinationSlug,
        categorySlug: typeof data.categorySlug === "string" ? data.categorySlug : "",
      };
    },
  )
  .handler(async ({ data }): Promise<ProductRelatedDTO> => {
    const supabase = publicClient();
    // Trae productos publicados con su empresa y join a destino+categoría.
    // Filtramos client-side por destino/categoría/exclusión: mantiene
    // la consulta simple y compatible con RLS TO anon.
    const { data: rows, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, tagline, product_type, price_amount, price_currency, status, deleted_at, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level, business:businesses!products_business_id_fkey ( id, slug, display_name, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug ) )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(120);
    if (error) throw new Error(`product_related_failed: ${error.message}`);

    const inDestination: MarketplaceProductCard[] = [];
    const sameCat: MarketplaceProductCard[] = [];
    const otherCat: MarketplaceProductCard[] = [];
    for (const row of rows ?? []) {
      const biz = row.business as
        | {
            id?: string;
            slug?: string;
            display_name?: string;
            status?: string;
            deleted_at?: string | null;
            destinations?: { slug?: unknown } | null;
            business_categories?: { slug?: unknown } | null;
          }
        | null;
      if (!biz || biz.status !== "published" || biz.deleted_at) continue;
      if (biz.id === data.businessId) continue;
      if (row.id === data.productId) continue;
      const destSlug = (biz.destinations as { slug?: unknown } | null)?.slug;
      const catSlug = (biz.business_categories as { slug?: unknown } | null)?.slug;
      if (typeof destSlug !== "string" || destSlug !== data.destinationSlug) continue;
      const card: MarketplaceProductCard = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        tagline: row.tagline ?? "",
        product_type: String(row.product_type ?? ""),
        price_amount: row.price_amount as number | null,
        price_currency: row.price_currency ?? "MXN",
        business_slug: biz.slug ?? "",
        business_name: biz.display_name ?? "",
        conversion_mode: String((row as Record<string, unknown>).conversion_mode ?? "informacion"),
        primary_action_label:
          ((row as Record<string, unknown>).primary_action_label as string | null) ?? null,
        secondary_action_mode:
          ((row as Record<string, unknown>).secondary_action_mode as string | null) ?? null,
        secondary_action_label:
          ((row as Record<string, unknown>).secondary_action_label as string | null) ?? null,
        accepts_online_payment: Boolean((row as Record<string, unknown>).accepts_online_payment),
        requires_availability: Boolean((row as Record<string, unknown>).requires_availability),
        visibility_level: String((row as Record<string, unknown>).visibility_level ?? "standard"),
      };
      inDestination.push(card);
      if (data.categorySlug && typeof catSlug === "string" && catSlug === data.categorySlug) {
        sameCat.push(card);
      } else {
        otherCat.push(card);
      }
      if (inDestination.length >= 24) break;
    }

    return {
      sameCategoryInDestination: sameCat.slice(0, 6),
      otherInDestination: otherCat.slice(0, 6),
    };
  });