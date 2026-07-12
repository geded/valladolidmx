/**
 * Portal Empresarial · Etapa 6 — Productos y Promociones.
 *
 * Server functions con `requireSupabaseAuth`. Whitelist explícita. Toda
 * escritura va por RPCs SECURITY DEFINER que revalidan
 * `has_business_access('editor')` y registran auditoría en
 * `content_audit_log`. El cliente nunca usa SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertUnderLimit,
  getEffectiveLimits,
} from "@/lib/visibility/plan-limits";

export type ProductType =
  | "experiencia"
  | "hotel"
  | "restaurante"
  | "evento"
  | "tour"
  | "transporte"
  | "servicio"
  | "artesanal";

export type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export type PortalProduct = {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  product_type: ProductType;
  tagline: string | null;
  description: string | null;
  price_amount: number | null;
  price_currency: string;
  duration_minutes: number | null;
  capacity: number | null;
  status: ContentStatus;
  updated_at: string;
  direct_sale_enabled: boolean;
  direct_sale_price_amount: number | null;
  direct_sale_currency: string | null;
  direct_sale_commission_bps: number | null;
  direct_sale_cancellation_policy: string | null;
  direct_sale_terms: string | null;
  direct_sale_min_lead_hours: number | null;
  direct_sale_max_quantity: number | null;
};

export type PortalPromotion = {
  id: string;
  business_id: string | null;
  product_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  terms: string | null;
  discount_percent: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: ContentStatus;
  updated_at: string;
};

// ---------- Reads ----------

export const listBusinessProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string }) => {
    if (!data?.businessId) throw new Error("businessId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalProduct[]> => {
    const { supabase, userId } = context;
    const { data: ok } = await (supabase.rpc as any)("has_business_access", {
      _user_id: userId,
      _business_id: data.businessId,
      _min_role: "viewer",
    });
    if (!ok) throw new Error("forbidden_business_access");
    const { data: rows, error } = await supabase
      .from("products")
      .select(
        "id,business_id,name,slug,product_type,tagline,description,price_amount,price_currency,duration_minutes,capacity,status,updated_at,direct_sale_enabled,direct_sale_price_amount,direct_sale_currency,direct_sale_commission_bps,direct_sale_cancellation_policy,direct_sale_terms,direct_sale_min_lead_hours,direct_sale_max_quantity",
      )
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PortalProduct[];
  });

export const listBusinessPromotions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string }) => {
    if (!data?.businessId) throw new Error("businessId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalPromotion[]> => {
    const { supabase, userId } = context;
    const { data: ok } = await (supabase.rpc as any)("has_business_access", {
      _user_id: userId,
      _business_id: data.businessId,
      _min_role: "viewer",
    });
    if (!ok) throw new Error("forbidden_business_access");
    const { data: rows, error } = await supabase
      .from("promotions")
      .select(
        "id,business_id,product_id,title,slug,description,terms,discount_percent,starts_at,ends_at,status,updated_at",
      )
      .eq("business_id", data.businessId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PortalPromotion[];
  });

// ---------- Products writes ----------

const PRODUCT_TYPES: ReadonlySet<ProductType> = new Set([
  "experiencia",
  "hotel",
  "restaurante",
  "evento",
  "tour",
  "transporte",
  "servicio",
  "artesanal",
]);

function assertSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120)
    throw new Error("invalid_slug");
}

export const createBusinessProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      businessId: string;
      name: string;
      slug: string;
      productType: ProductType;
      tagline?: string | null;
      description?: string | null;
      priceAmount?: number | null;
      priceCurrency?: string | null;
      durationMinutes?: number | null;
      capacity?: number | null;
    }) => {
      if (!data?.businessId) throw new Error("businessId required");
      if (!data.name?.trim() || data.name.length > 200)
        throw new Error("invalid_name");
      assertSlug(data.slug);
      if (!PRODUCT_TYPES.has(data.productType))
        throw new Error("invalid_product_type");
      if (data.priceAmount != null && data.priceAmount < 0)
        throw new Error("invalid_price");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase } = context;
    // Ola 7.4.b · Límite `max_products` del plan efectivo.
    const limits = await getEffectiveLimits(supabase, data.businessId);
    if (limits.max_products && limits.max_products > 0) {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("business_id", data.businessId)
        .is("deleted_at", null);
      assertUnderLimit(limits, "max_products", count ?? 0);
    }
    const { data: id, error } = await (supabase.rpc as any)("create_business_product", {
      _business_id: data.businessId,
      _name: data.name,
      _slug: data.slug,
      _product_type: data.productType,
      _tagline: data.tagline ?? null,
      _description: data.description ?? null,
      _price_amount: data.priceAmount ?? null,
      _price_currency: data.priceCurrency ?? "MXN",
      _duration_minutes: data.durationMinutes ?? null,
      _capacity: data.capacity ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateBusinessProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      productId: string;
      name?: string | null;
      tagline?: string | null;
      description?: string | null;
      priceAmount?: number | null;
      priceCurrency?: string | null;
      durationMinutes?: number | null;
      capacity?: number | null;
      clearPrice?: boolean;
    }) => {
      if (!data?.productId) throw new Error("productId required");
      if (data.name != null && (!data.name.trim() || data.name.length > 200))
        throw new Error("invalid_name");
      if (data.priceAmount != null && data.priceAmount < 0)
        throw new Error("invalid_price");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("update_business_product", {
      _product_id: data.productId,
      _name: data.name ?? null,
      _tagline: data.tagline ?? null,
      _description: data.description ?? null,
      _price_amount: data.priceAmount ?? null,
      _price_currency: data.priceCurrency ?? null,
      _duration_minutes: data.durationMinutes ?? null,
      _capacity: data.capacity ?? null,
      _clear_price: data.clearPrice ?? false,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const archiveBusinessProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("archive_business_product", {
      _product_id: data.productId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const requestProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string; notes?: string | null }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("request_product_review", {
      _product_id: data.productId,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const withdrawProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string; notes?: string | null }) => {
    if (!data?.productId) throw new Error("productId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("withdraw_product_review", {
      _product_id: data.productId,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Promotions writes ----------

export const createBusinessPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      businessId: string;
      title: string;
      slug: string;
      description?: string | null;
      terms?: string | null;
      discountPercent?: number | null;
      startsAt?: string | null;
      endsAt?: string | null;
      productId?: string | null;
    }) => {
      if (!data?.businessId) throw new Error("businessId required");
      if (!data.title?.trim() || data.title.length > 200)
        throw new Error("invalid_title");
      assertSlug(data.slug);
      if (
        data.discountPercent != null &&
        (data.discountPercent < 0 || data.discountPercent > 100)
      )
        throw new Error("invalid_discount");
      if (
        data.startsAt &&
        data.endsAt &&
        new Date(data.endsAt) <= new Date(data.startsAt)
      )
        throw new Error("invalid_date_range");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    // Ola 7.4.b · Límite `max_active_coupons` del plan efectivo (promos vigentes).
    const limits = await getEffectiveLimits(context.supabase, data.businessId);
    if (limits.max_active_coupons && limits.max_active_coupons > 0) {
      const nowIso = new Date().toISOString();
      let query = context.supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", data.businessId)
        .is("deleted_at", null)
        .neq("status", "archived");
      // Sólo consideramos vigentes: sin fecha fin o fin en el futuro.
      query = query.or(`ends_at.is.null,ends_at.gte.${nowIso}`);
      const { count } = await query;
      assertUnderLimit(limits, "max_active_coupons", count ?? 0);
    }
    const { data: id, error } = await (context.supabase.rpc as any)(
      "create_business_promotion",
      {
        _business_id: data.businessId,
        _title: data.title,
        _slug: data.slug,
        _description: data.description ?? null,
        _terms: data.terms ?? null,
        _discount_percent: data.discountPercent ?? null,
        _starts_at: data.startsAt ?? null,
        _ends_at: data.endsAt ?? null,
        _product_id: data.productId ?? null,
      },
    );
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateBusinessPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      promotionId: string;
      title?: string | null;
      description?: string | null;
      terms?: string | null;
      discountPercent?: number | null;
      startsAt?: string | null;
      endsAt?: string | null;
      clearDiscount?: boolean;
      clearDates?: boolean;
    }) => {
      if (!data?.promotionId) throw new Error("promotionId required");
      if (data.title != null && (!data.title.trim() || data.title.length > 200))
        throw new Error("invalid_title");
      if (
        data.discountPercent != null &&
        (data.discountPercent < 0 || data.discountPercent > 100)
      )
        throw new Error("invalid_discount");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("update_business_promotion", {
      _promotion_id: data.promotionId,
      _title: data.title ?? null,
      _description: data.description ?? null,
      _terms: data.terms ?? null,
      _discount_percent: data.discountPercent ?? null,
      _starts_at: data.startsAt ?? null,
      _ends_at: data.endsAt ?? null,
      _clear_discount: data.clearDiscount ?? false,
      _clear_dates: data.clearDates ?? false,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const archiveBusinessPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { promotionId: string }) => {
    if (!data?.promotionId) throw new Error("promotionId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("archive_business_promotion", {
      _promotion_id: data.promotionId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const requestPromotionReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { promotionId: string; notes?: string | null }) => {
    if (!data?.promotionId) throw new Error("promotionId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("request_promotion_review", {
      _promotion_id: data.promotionId,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const withdrawPromotionReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { promotionId: string; notes?: string | null }) => {
    if (!data?.promotionId) throw new Error("promotionId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.rpc as any)("withdraw_promotion_review", {
      _promotion_id: data.promotionId,
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });