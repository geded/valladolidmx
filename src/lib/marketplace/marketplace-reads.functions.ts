/**
 * marketplace/marketplace-reads.functions.ts — Lecturas públicas SSR
 * para la Vitrina del Marketplace (Ola 4 · Etapa 1).
 *
 * Reglas (Plan 14.40):
 *  - Server publishable client (anon, RLS aplica como anon).
 *  - NO usa requireSupabaseAuth: rutas públicas SSR sin sesión.
 *  - NO usa supabaseAdmin: las políticas TO anon ya autorizan la lectura.
 *  - Sólo proyecta columnas seguras necesarias para el render público.
 *  - Sin escrituras, sin RPCs; sin cambios al modelo de dominio.
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

export interface MarketplaceBusinessCard {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  destination_slug: string;
  category_slug: string;
  verified: boolean;
}

export interface MarketplaceProductCard {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  product_type: string;
  price_amount: number | null;
  price_currency: string;
  business_slug: string;
  business_name: string;
}

export interface MarketplacePromotionCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  discount_percent: number | null;
  starts_at: string | null;
  ends_at: string | null;
  business_slug: string;
  business_name: string;
}

export interface MarketplaceBusinessDetail extends MarketplaceBusinessCard {
  description: string;
  products: MarketplaceProductCard[];
  promotions: MarketplacePromotionCard[];
}

export interface MarketplaceSearchHit {
  product_id: string;
  product_slug: string;
  product_name: string;
  product_tagline: string;
  product_type: string;
  price_amount: number | null;
  price_currency: string;
  business_id: string;
  business_slug: string;
  business_name: string;
  destination_slug: string;
  category_slug: string;
}

export interface MarketplaceSearchResult {
  items: MarketplaceSearchHit[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketplaceSearchInput {
  q?: string | null;
  destination_slug?: string | null;
  category_slug?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  limit?: number;
  offset?: number;
}

/**
 * listMarketplaceBusinesses — Devuelve empresas publicadas para el
 * listado público del Marketplace. Whitelist estricta de columnas.
 */
export const listMarketplaceBusinesses = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketplaceBusinessCard[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, verified, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .limit(120);
    if (error) throw new Error(`marketplace_businesses_failed: ${error.message}`);
    return (data ?? []).map((row) => {
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
  },
);

/**
 * getMarketplaceBusinessBySlug — Detalle público de una empresa con sus
 * productos y promociones publicadas. Lookups acotados (sin N+1).
 */
export const getMarketplaceBusinessBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input || typeof input.slug !== "string" || input.slug.length === 0 || input.slug.length > 200) {
      throw new Error("invalid_slug");
    }
    return { slug: input.slug };
  })
  .handler(async ({ data }): Promise<MarketplaceBusinessDetail | null> => {
    const supabase = publicClient();
    const { data: biz, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, description, verified, status, deleted_at, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`marketplace_business_failed: ${error.message}`);
    if (!biz) return null;

    const [{ data: products, error: pErr }, { data: promos, error: prErr }] = await Promise.all([
      supabase
        .from("products")
        .select("id, slug, name, tagline, product_type, price_amount, price_currency, status, deleted_at")
        .eq("business_id", biz.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(48),
      supabase
        .from("promotions")
        .select("id, slug, title, description, discount_percent, starts_at, ends_at, status, deleted_at")
        .eq("business_id", biz.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("ends_at", { ascending: true, nullsFirst: false })
        .limit(24),
    ]);
    if (pErr) throw new Error(`marketplace_products_failed: ${pErr.message}`);
    if (prErr) throw new Error(`marketplace_promos_failed: ${prErr.message}`);

    const destSlug = (biz.destinations as { slug?: unknown } | null)?.slug;
    const catSlug = (biz.business_categories as { slug?: unknown } | null)?.slug;

    return {
      id: biz.id,
      slug: biz.slug,
      display_name: biz.display_name,
      tagline: biz.tagline ?? "",
      description: biz.description ?? "",
      verified: Boolean(biz.verified),
      destination_slug: typeof destSlug === "string" ? destSlug : "",
      category_slug: typeof catSlug === "string" ? catSlug : "",
      products: (products ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? "",
        product_type: String(p.product_type),
        price_amount: p.price_amount,
        price_currency: p.price_currency,
        business_slug: biz.slug,
        business_name: biz.display_name,
      })),
      promotions: (promos ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description ?? "",
        discount_percent: p.discount_percent !== null ? Number(p.discount_percent) : null,
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        business_slug: biz.slug,
        business_name: biz.display_name,
      })),
    };
  });

/**
 * searchMarketplace — Ola 4 · Etapa 2. Invoca el RPC público
 * `search_marketplace` (SECURITY DEFINER · solo SELECT) sobre el
 * cliente publishable. Sin auth, sin acceso a tablas crudas.
 * Whitelist estricta de parámetros y límites server-side.
 */
export const searchMarketplace = createServerFn({ method: "GET" })
  .inputValidator((input: MarketplaceSearchInput | undefined) => {
    const v = input ?? {};
    const clampStr = (s: unknown, max = 120) =>
      typeof s === "string" && s.length > 0 && s.length <= max ? s : null;
    const clampNum = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1_000_000_000 ? n : null;
    const limit = typeof v.limit === "number" && v.limit > 0 ? Math.min(100, Math.floor(v.limit)) : 24;
    const offset = typeof v.offset === "number" && v.offset >= 0 ? Math.floor(v.offset) : 0;
    return {
      q: clampStr(v.q, 200),
      destination_slug: clampStr(v.destination_slug),
      category_slug: clampStr(v.category_slug),
      price_min: clampNum(v.price_min),
      price_max: clampNum(v.price_max),
      limit,
      offset,
    };
  })
  .handler(async ({ data }): Promise<MarketplaceSearchResult> => {
    const supabase = publicClient();
    // El tipo generado puede no haberse regenerado tras la migración;
    // se llama vía cast acotado y se valida la forma del resultado.
    const { data: rows, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "search_marketplace",
      {
        p_q: data.q,
        p_destination_slug: data.destination_slug,
        p_category_slug: data.category_slug,
        p_price_min: data.price_min,
        p_price_max: data.price_max,
        p_limit: data.limit,
        p_offset: data.offset,
      },
    );
    if (error) throw new Error(`marketplace_search_failed: ${error.message}`);
    const list = (rows ?? []) as Array<Record<string, unknown>>;
    const total = list.length > 0 ? Number(list[0].total_count ?? 0) : 0;
    const items: MarketplaceSearchHit[] = list.map((r) => ({
      product_id: String(r.product_id),
      product_slug: String(r.product_slug),
      product_name: String(r.product_name ?? ""),
      product_tagline: r.product_tagline ? String(r.product_tagline) : "",
      product_type: String(r.product_type ?? ""),
      price_amount: r.price_amount !== null && r.price_amount !== undefined ? Number(r.price_amount) : null,
      price_currency: String(r.price_currency ?? "MXN"),
      business_id: String(r.business_id),
      business_slug: String(r.business_slug),
      business_name: String(r.business_name ?? ""),
      destination_slug: r.destination_slug ? String(r.destination_slug) : "",
      category_slug: r.category_slug ? String(r.category_slug) : "",
    }));
    return { items, total, limit: data.limit, offset: data.offset };
  });