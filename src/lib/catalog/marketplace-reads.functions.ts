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
import { resolveBusinessPlanTier } from "@/lib/plans/plans-catalog";

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
  conversion_mode: string;
  primary_action_label: string | null;
  secondary_action_mode: string | null;
  secondary_action_label: string | null;
  accepts_online_payment: boolean;
  requires_availability: boolean;
  visibility_level: string;
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
  /** Plan comercial contratado. Resuelto vía Catálogo Central de Planes. */
  plan_tier: "free" | "starter" | "pro" | "premium";
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

/* ------------------------------------------------------------------ *
 * Product Detail (US-R3 · Sub-ola 2.3a — Product Surface v1)
 * ------------------------------------------------------------------ */

export interface ProductMediaItem {
  id: string;
  role: "cover" | "gallery" | string;
  url: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
}

export interface ProductBusinessContext {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  verified: boolean;
  destination_slug: string;
  category_slug: string;
  plan_tier: "free" | "starter" | "pro" | "premium";
  primary_contact: { type: string; value: string; label: string | null } | null;
  primary_location: {
    label: string | null;
    address_line1: string | null;
    address_line2: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export interface ProductFaqItem {
  id: string;
  question: string;
  answer: string;
  position: number;
}

export interface ProductReviewItem {
  id: string;
  author_display_name: string;
  rating: number;
  title: string | null;
  body: string;
  published_at: string | null;
  language: string | null;
  visit_type: string | null;
  verified_source:
    | "verified_purchase"
    | "managed_visit"
    | "verified_visit"
    | "declared_visitor"
    | null;
  business_response: string | null;
  business_response_at: string | null;
}

export interface ProductReviewStats {
  count: number;
  average: number;
  verifiedCount: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface MarketplaceProductDetail {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  product_type: string;
  price_amount: number | null;
  price_currency: string;
  conversion_mode: string;
  primary_action_label: string | null;
  secondary_action_mode: string | null;
  secondary_action_label: string | null;
  accepts_online_payment: boolean;
  requires_availability: boolean;
  visibility_level: string;
  cover_url: string | null;
  media: ProductMediaItem[];
  business: ProductBusinessContext;
  related: MarketplaceProductCard[];
  promotions: MarketplacePromotionCard[];
  reviews: ProductReviewItem[];
  review_stats: ProductReviewStats;
  faqs: ProductFaqItem[];
}

/**
 * getMarketplaceProductBySlug — Detalle público de un producto publicado.
 * Join a empresa padre (contexto mínimo: contacto + ubicación pública),
 * portada + galería (via product_media/media_assets con signed URLs),
 * promociones vigentes de la empresa, reviews aprobadas, FAQs
 * publicadas y hasta 6 productos relacionados de la misma empresa.
 *
 * - Publishable client + RLS TO anon (products/product_media/promotions
 *   /reviews/faqs ya tienen policies TO anon SELECT filtradas por
 *   status='published').
 * - Signed URLs de media se firman server-side con supabaseAdmin
 *   (import dentro del handler) porque el bucket `products` es privado.
 * - Sólo columnas seguras. Sin escrituras. Sin PII.
 */
export const getMarketplaceProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (
      !input ||
      typeof input.slug !== "string" ||
      input.slug.length === 0 ||
      input.slug.length > 200
    ) {
      throw new Error("invalid_slug");
    }
    return { slug: input.slug };
  })
  .handler(async ({ data }): Promise<MarketplaceProductDetail | null> => {
    const supabase = publicClient();
    const { data: prod, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, tagline, description, product_type, price_amount, price_currency, status, deleted_at, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level, business_id",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`marketplace_product_failed: ${error.message}`);
    if (!prod) return null;

    const businessId = prod.business_id as string;

    const [
      { data: biz, error: bErr },
      { data: mediaRows, error: mErr },
      { data: contacts },
      { data: locations },
      { data: promos },
      { data: reviews },
      { data: faqs },
      { data: relatedRows },
    ] = await Promise.all([
      supabase
        .from("businesses")
        .select(
          "id, slug, display_name, tagline, verified, status, deleted_at, metadata, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
        )
        .eq("id", businessId)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("product_media")
        .select(
          "id, role, sort_order, media_assets:media_assets ( id, storage_bucket, storage_path, alt_text, width, height )",
        )
        .eq("product_id", prod.id)
        .order("sort_order", { ascending: true })
        .limit(24),
      supabase
        .from("business_contacts")
        .select("contact_type, value, label, is_public, sort_order, deleted_at")
        .eq("business_id", businessId)
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .limit(4),
      supabase
        .from("business_locations")
        .select("label, address_line1, address_line2, latitude, longitude, is_primary, deleted_at")
        .eq("business_id", businessId)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .limit(1),
      supabase
        .from("promotions")
        .select("id, slug, title, description, discount_percent, starts_at, ends_at, status, deleted_at")
        .eq("business_id", businessId)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("ends_at", { ascending: true, nullsFirst: false })
        .limit(6),
      supabase
        .from("reviews")
        .select("id, author_display_name, rating, title, body, published_at, language, visit_type, verified_source, business_response, business_response_at, status, deleted_at, subject_kind, subject_id")
        .eq("subject_kind", "product")
        .eq("subject_id", prod.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(20),
      supabase
        .from("faqs")
        .select("id, question, answer, position, status, deleted_at, entity_kind, entity_id, locale")
        .eq("entity_kind", "product")
        .eq("entity_id", prod.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("position", { ascending: true })
        .limit(12),
      supabase
        .from("products")
        .select(
          "id, slug, name, tagline, product_type, price_amount, price_currency, status, deleted_at, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level",
        )
        .eq("business_id", businessId)
        .eq("status", "published")
        .is("deleted_at", null)
        .neq("id", prod.id)
        .order("name", { ascending: true })
        .limit(6),
    ]);

    if (bErr) throw new Error(`marketplace_product_biz_failed: ${bErr.message}`);
    if (mErr) throw new Error(`marketplace_product_media_failed: ${mErr.message}`);
    if (!biz) return null;

    // Firma de URLs de media (bucket privado). Best-effort: si algún
    // asset no puede firmarse, cae a null y el bloque muestra placeholder.
    let media: ProductMediaItem[] = [];
    const rows = (mediaRows ?? []) as Array<{
      id: string;
      role: string;
      sort_order: number | null;
      media_assets: {
        id: string;
        storage_bucket: string;
        storage_path: string;
        alt_text: string | null;
        width: number | null;
        height: number | null;
      } | null;
    }>;
    if (rows.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const signed = await Promise.all(
          rows.map(async (r) => {
            const a = r.media_assets;
            if (!a) return { row: r, url: null as string | null };
            const { data: s } = await supabaseAdmin.storage
              .from(a.storage_bucket)
              .createSignedUrl(a.storage_path, 3600);
            return { row: r, url: s?.signedUrl ?? null };
          }),
        );
        media = signed.map(({ row, url }) => ({
          id: row.id,
          role: row.role,
          url,
          alt: row.media_assets?.alt_text ?? null,
          width: row.media_assets?.width ?? null,
          height: row.media_assets?.height ?? null,
          sort_order: Number(row.sort_order ?? 0),
        }));
      } catch {
        // Si el admin client no está disponible o storage falla,
        // exponemos la lista sin URLs — la UI muestra placeholder.
        media = rows.map((r) => ({
          id: r.id,
          role: r.role,
          url: null,
          alt: r.media_assets?.alt_text ?? null,
          width: r.media_assets?.width ?? null,
          height: r.media_assets?.height ?? null,
          sort_order: Number(r.sort_order ?? 0),
        }));
      }
    }

    const cover = media.find((m) => m.role === "cover") ?? media[0] ?? null;

    const destSlug = (biz.destinations as { slug?: unknown } | null)?.slug;
    const catSlug = (biz.business_categories as { slug?: unknown } | null)?.slug;
    const planTier = resolveBusinessPlanTier(
      (biz as { metadata?: Record<string, unknown> | null }).metadata ?? null,
    );

    const contactRows = (contacts ?? []) as Array<{
      contact_type: string;
      value: string;
      label: string | null;
    }>;
    const primaryContact = contactRows[0]
      ? {
          type: contactRows[0].contact_type,
          value: contactRows[0].value,
          label: contactRows[0].label,
        }
      : null;

    const locRow = ((locations ?? []) as Array<{
      label: string | null;
      address_line1: string | null;
      address_line2: string | null;
      latitude: number | string | null;
      longitude: number | string | null;
    }>)[0];
    const primaryLocation = locRow
      ? {
          label: locRow.label,
          address_line1: locRow.address_line1,
          address_line2: locRow.address_line2,
          latitude: locRow.latitude !== null ? Number(locRow.latitude) : null,
          longitude: locRow.longitude !== null ? Number(locRow.longitude) : null,
        }
      : null;

    const related: MarketplaceProductCard[] = ((relatedRows ?? []) as Array<Record<string, unknown>>).map(
      (p) => ({
        id: String(p.id),
        slug: String(p.slug),
        name: String(p.name),
        tagline: (p.tagline as string) ?? "",
        product_type: String(p.product_type),
        price_amount: p.price_amount !== null && p.price_amount !== undefined ? Number(p.price_amount) : null,
        price_currency: String(p.price_currency ?? "MXN"),
        business_slug: biz.slug,
        business_name: biz.display_name,
        conversion_mode: String(p.conversion_mode ?? "informacion"),
        primary_action_label: (p.primary_action_label as string | null) ?? null,
        secondary_action_mode: (p.secondary_action_mode as string | null) ?? null,
        secondary_action_label: (p.secondary_action_label as string | null) ?? null,
        accepts_online_payment: Boolean(p.accepts_online_payment),
        requires_availability: Boolean(p.requires_availability),
        visibility_level: String(p.visibility_level ?? "standard"),
      }),
    );

    return {
      id: prod.id,
      slug: prod.slug,
      name: prod.name,
      tagline: prod.tagline ?? "",
      description: prod.description ?? "",
      product_type: String(prod.product_type),
      price_amount: prod.price_amount !== null ? Number(prod.price_amount) : null,
      price_currency: String(prod.price_currency ?? "MXN"),
      conversion_mode: String((prod as Record<string, unknown>).conversion_mode ?? "informacion"),
      primary_action_label: ((prod as Record<string, unknown>).primary_action_label as string | null) ?? null,
      secondary_action_mode: ((prod as Record<string, unknown>).secondary_action_mode as string | null) ?? null,
      secondary_action_label: ((prod as Record<string, unknown>).secondary_action_label as string | null) ?? null,
      accepts_online_payment: Boolean((prod as Record<string, unknown>).accepts_online_payment),
      requires_availability: Boolean((prod as Record<string, unknown>).requires_availability),
      visibility_level: String((prod as Record<string, unknown>).visibility_level ?? "standard"),
      cover_url: cover?.url ?? null,
      media,
      business: {
        id: biz.id,
        slug: biz.slug,
        display_name: biz.display_name,
        tagline: biz.tagline ?? "",
        verified: Boolean(biz.verified),
        destination_slug: typeof destSlug === "string" ? destSlug : "",
        category_slug: typeof catSlug === "string" ? catSlug : "",
        plan_tier: planTier,
        primary_contact: primaryContact,
        primary_location: primaryLocation,
      },
      related,
      promotions: (promos ?? []).map((p) => ({
        id: p.id as string,
        slug: p.slug as string,
        title: p.title as string,
        description: (p.description as string) ?? "",
        discount_percent: p.discount_percent !== null ? Number(p.discount_percent) : null,
        starts_at: p.starts_at as string | null,
        ends_at: p.ends_at as string | null,
        business_slug: biz.slug,
        business_name: biz.display_name,
      })),
      reviews: (reviews ?? []).map((r) => {
        const row = r as unknown as Record<string, unknown>;
        return {
          id: row.id as string,
          author_display_name: (row.author_display_name as string) ?? "Viajero",
          rating: Number(row.rating ?? 0),
          title: (row.title as string | null) ?? null,
          body: (row.body as string) ?? "",
          published_at: (row.published_at as string | null) ?? null,
          language: (row.language as string | null) ?? null,
          visit_type: (row.visit_type as string | null) ?? null,
          verified_source:
            (row.verified_source as ProductReviewItem["verified_source"]) ?? null,
          business_response: (row.business_response as string | null) ?? null,
          business_response_at: (row.business_response_at as string | null) ?? null,
        } satisfies ProductReviewItem;
      }),
      review_stats: await (async (): Promise<ProductReviewStats> => {
        const { data: statsRaw } = await supabase.rpc("get_review_stats", {
          _subject_kind: "product",
          _subject_id: prod.id,
        });
        const src = (statsRaw ?? {}) as Record<string, unknown>;
        const dist = (src.distribution ?? {}) as Record<string, unknown>;
        return {
          count: Number(src.count ?? 0),
          average: Number(src.average ?? 0),
          verifiedCount: Number(src.verifiedCount ?? 0),
          distribution: {
            "1": Number(dist["1"] ?? 0),
            "2": Number(dist["2"] ?? 0),
            "3": Number(dist["3"] ?? 0),
            "4": Number(dist["4"] ?? 0),
            "5": Number(dist["5"] ?? 0),
          },
        };
      })(),
      faqs: (faqs ?? []).map((f) => ({
        id: f.id as string,
        question: (f.question as string) ?? "",
        answer: (f.answer as string) ?? "",
        position: Number(f.position ?? 0),
      })),
    };
  });

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
        "id, slug, display_name, tagline, description, verified, status, deleted_at, metadata, destinations!businesses_destination_id_fkey ( slug ), business_categories!businesses_primary_category_id_fkey ( slug )",
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
        .select("id, slug, name, tagline, product_type, price_amount, price_currency, status, deleted_at, conversion_mode, primary_action_label, secondary_action_mode, secondary_action_label, accepts_online_payment, requires_availability, visibility_level")
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
    const planTier = resolveBusinessPlanTier(
      (biz as { metadata?: Record<string, unknown> | null }).metadata ?? null,
    );

    return {
      id: biz.id,
      slug: biz.slug,
      display_name: biz.display_name,
      tagline: biz.tagline ?? "",
      description: biz.description ?? "",
      verified: Boolean(biz.verified),
      destination_slug: typeof destSlug === "string" ? destSlug : "",
      category_slug: typeof catSlug === "string" ? catSlug : "",
      plan_tier: planTier,
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
        conversion_mode: String((p as Record<string, unknown>).conversion_mode ?? "informacion"),
        primary_action_label:
          ((p as Record<string, unknown>).primary_action_label as string | null) ?? null,
        secondary_action_mode:
          ((p as Record<string, unknown>).secondary_action_mode as string | null) ?? null,
        secondary_action_label:
          ((p as Record<string, unknown>).secondary_action_label as string | null) ?? null,
        accepts_online_payment: Boolean((p as Record<string, unknown>).accepts_online_payment),
        requires_availability: Boolean((p as Record<string, unknown>).requires_availability),
        visibility_level: String((p as Record<string, unknown>).visibility_level ?? "standard"),
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
    const startedAt = Date.now();
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
    if (error) {
      // 14.40.7 — alerta funcional: error crítico en API pública.
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await (supabaseAdmin.rpc as unknown as (
          fn: string, args: Record<string, unknown>,
        ) => Promise<unknown>)("raise_system_alert", {
          p_kind: "api.search_marketplace.error",
          p_severity: "critical",
          p_message: `search_marketplace falló: ${error.message}`,
          p_payload: { q: data.q ?? null },
        });
      } catch { /* la observabilidad nunca rompe el flujo */ }
      throw new Error(`marketplace_search_failed: ${error.message}`);
    }
    const list = (Array.isArray(rows) ? rows : []) as Array<Record<string, unknown>>;
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
    // 14.40.7 — telemetría de búsqueda (no bloqueante).
    try {
      const duration = Date.now() - startedAt;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<unknown>)("record_search_metric", {
        p_q: data.q,
        p_destination_slug: data.destination_slug,
        p_category_slug: data.category_slug,
        p_result_count: total,
        p_duration_ms: duration,
        p_user_id: null,
      });
    } catch { /* la observabilidad nunca rompe el flujo */ }
    return { items, total, limit: data.limit, offset: data.offset };
  });