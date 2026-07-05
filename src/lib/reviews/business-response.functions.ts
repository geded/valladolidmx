/**
 * Trust Engine v1 · US-G.6 — Respuesta del negocio a reseñas.
 *
 * Server fns autenticadas para el Portal Empresarial:
 *  - `listOwnerReviews`  → reseñas de las empresas y productos que el
 *    usuario administra (RLS filtra vía `reviews_business_owner_read`).
 *  - `submitBusinessResponse` → guarda/edita/borra la respuesta pública
 *    delegando en el RPC SECURITY DEFINER `set_business_response`, que
 *    valida acceso al negocio dueño y limita los campos actualizables.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OwnerReviewStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export interface OwnerReview {
  id: string;
  subjectKind: "business" | "product";
  subjectId: string;
  subjectLabel: string | null;
  businessId: string | null;
  businessDisplayName: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  authorDisplayName: string | null;
  verifiedSource: string | null;
  visitDate: string | null;
  status: OwnerReviewStatus;
  publishedAt: string | null;
  createdAt: string;
  businessResponse: string | null;
  businessResponseAt: string | null;
}

/* ------------------------------------------------------------------ *
 * listOwnerReviews
 * ------------------------------------------------------------------ */
export const listOwnerReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = (raw ?? {}) as { businessId?: unknown };
    const businessId =
      typeof d.businessId === "string" && /^[0-9a-f-]{36}$/i.test(d.businessId)
        ? d.businessId
        : null;
    return { businessId };
  })
  .handler(async ({ data, context }): Promise<OwnerReview[]> => {
    const { supabase } = context;

    // Traemos reseñas (RLS filtra a las que el usuario administra),
    // luego resolvemos labels de sujeto para presentación.
    const { data: rows, error } = await supabase
      .from("reviews")
      .select(
        "id, subject_kind, subject_id, rating, title, body, author_display_name, verified_source, visit_date, status, published_at, created_at, business_response, business_response_at",
      )
      .in("subject_kind", ["business", "product"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`owner_reviews_read_failed: ${error.message}`);

    const list = (rows ?? []) as Array<Record<string, unknown>>;
    if (list.length === 0) return [];

    const businessIds = new Set<string>();
    const productIds = new Set<string>();
    for (const r of list) {
      if (r.subject_kind === "business") businessIds.add(String(r.subject_id));
      else if (r.subject_kind === "product") productIds.add(String(r.subject_id));
    }

    const [productsRes, businessesRes] = await Promise.all([
      productIds.size > 0
        ? supabase
            .from("products")
            .select("id, name, business_id, business:businesses!inner(id, display_name)")
            .in("id", Array.from(productIds))
        : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null }),
      businessIds.size > 0
        ? supabase
            .from("businesses")
            .select("id, display_name")
            .in("id", Array.from(businessIds))
        : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null }),
    ]);
    if ((productsRes as { error: unknown }).error) {
      throw new Error("owner_reviews_products_failed");
    }
    if ((businessesRes as { error: unknown }).error) {
      throw new Error("owner_reviews_businesses_failed");
    }

    const productMap = new Map<
      string,
      { name: string; businessId: string; businessName: string | null }
    >();
    for (const p of ((productsRes as { data: unknown[] }).data ?? []) as Array<
      Record<string, unknown>
    >) {
      const biz = p.business as { id?: string; display_name?: string } | undefined;
      productMap.set(String(p.id), {
        name: String(p.name ?? ""),
        businessId: String(p.business_id ?? biz?.id ?? ""),
        businessName: biz?.display_name ?? null,
      });
    }
    const bizMap = new Map<string, string>();
    for (const b of ((businessesRes as { data: unknown[] }).data ?? []) as Array<
      Record<string, unknown>
    >) {
      bizMap.set(String(b.id), String(b.display_name ?? ""));
    }

    const filtered = data.businessId
      ? list.filter((r) => {
          if (r.subject_kind === "business") return String(r.subject_id) === data.businessId;
          const p = productMap.get(String(r.subject_id));
          return p?.businessId === data.businessId;
        })
      : list;

    return filtered.map((r) => {
      const kind = r.subject_kind === "product" ? "product" : "business";
      const sid = String(r.subject_id);
      const p = kind === "product" ? productMap.get(sid) : null;
      const businessId = kind === "business" ? sid : p?.businessId ?? null;
      const businessName = kind === "business" ? bizMap.get(sid) ?? null : p?.businessName ?? null;
      return {
        id: String(r.id),
        subjectKind: kind,
        subjectId: sid,
        subjectLabel: kind === "business" ? businessName : p?.name ?? null,
        businessId,
        businessDisplayName: businessName,
        rating: Number(r.rating ?? 0),
        title: (r.title as string | null) ?? null,
        body: (r.body as string | null) ?? null,
        authorDisplayName: (r.author_display_name as string | null) ?? null,
        verifiedSource: (r.verified_source as string | null) ?? null,
        visitDate: (r.visit_date as string | null) ?? null,
        status: (r.status as OwnerReviewStatus) ?? "in_review",
        publishedAt: (r.published_at as string | null) ?? null,
        createdAt: String(r.created_at ?? ""),
        businessResponse: (r.business_response as string | null) ?? null,
        businessResponseAt: (r.business_response_at as string | null) ?? null,
      };
    });
  });

/* ------------------------------------------------------------------ *
 * submitBusinessResponse
 * ------------------------------------------------------------------ */
export interface BusinessResponseResult {
  id: string;
  businessResponse: string | null;
  businessResponseAt: string | null;
}

export const submitBusinessResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = (raw ?? {}) as { reviewId?: unknown; response?: unknown };
    if (typeof d.reviewId !== "string" || !/^[0-9a-f-]{36}$/i.test(d.reviewId)) {
      throw new Error("invalid_review_id");
    }
    const raw_response = typeof d.response === "string" ? d.response : "";
    const response = raw_response.trim();
    if (response.length > 2000) throw new Error("response_too_long");
    return {
      reviewId: d.reviewId,
      response: response.length === 0 ? "" : response,
    };
  })
  .handler(async ({ data, context }): Promise<BusinessResponseResult> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("set_business_response", {
      _review_id: data.reviewId,
      _response: data.response, // empty string -> RPC normalizes to NULL (borra)
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    const r = (row ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id ?? data.reviewId),
      businessResponse: (r.business_response as string | null) ?? null,
      businessResponseAt: (r.business_response_at as string | null) ?? null,
    };
  });