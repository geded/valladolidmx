/**
 * cms/reads.functions.ts — Lecturas tipadas del CMS Studio (Ola 1 · Etapa 2).
 *
 * Cada server function:
 *  - Usa `requireSupabaseAuth` (RLS aplica como usuario autenticado).
 *  - Verifica server-side el rol editorial via RPC `is_editor_or_admin`.
 *  - Proyecta sólo columnas seguras necesarias para listados administrativos.
 *  - NO usa `supabaseAdmin` (servicio).
 *  - NO ejecuta migraciones ni muta el modelo de dominio.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface ListInput {
  limit?: number;
  offset?: number;
  search?: string;
}

function normalizeInput(data: ListInput | undefined): Required<ListInput> {
  const limit = Math.min(Math.max(Number(data?.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = Math.max(Number(data?.offset ?? 0), 0);
  const search = (data?.search ?? "").trim();
  return { limit, offset, search };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

/* ──────────────────────────────  Regiones  ────────────────────────────── */

export const listRegionsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("tourism_regions")
      .select("id, slug, name, status, updated_at", { count: "exact" })
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ──────────────────────────────  Destinos  ────────────────────────────── */

export const listDestinationsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("destinations")
      .select("id, slug, name, status, tourism_region_id, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ──────────────────────────  Zonas de destino  ────────────────────────── */

export const listZonesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("destination_zones")
      .select("id, slug, name, status, destination_id, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ────────────────────────────  Categorías  ────────────────────────────── */

export const listCategoriesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("business_categories")
      .select("id, slug, name, status, sort_order, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ────────────────────────────  Empresas  ──────────────────────────────── */

export const listBusinessesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("businesses")
      .select("id, slug, display_name, status, verified, destination_id, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("display_name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ────────────────────────────  Productos  ─────────────────────────────── */

export const listProductsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("products")
      .select("id, slug, name, product_type, status, business_id, updated_at", { count: "exact" })
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ─────────────────────────────  Media  ────────────────────────────────── */

/**
 * Biblioteca Media · "Mis imágenes" y filtros por uso.
 *
 * Delta aditivo sobre la lectura existente: se conservan columnas, orden y
 * paginación. Se añaden dos filtros opcionales:
 *  - `scope: "mine"` limita a las imágenes de las empresas del usuario
 *    (y a las que él mismo cargó), sin exponer activos de terceros.
 *  - `usage` agrupa los contextos reales del catálogo en portadas, galerías
 *    y logos, dejando el resto en "otros".
 */
export type MediaUsageFilter = "all" | "cover" | "gallery" | "logo" | "other";
export type MediaScopeFilter = "all" | "mine";

const MEDIA_COVER_CONTEXTS = ["cover", "cover_mobile", "hero", "business_cover_preview"];
const MEDIA_GALLERY_CONTEXTS = ["gallery"];
const MEDIA_LOGO_CONTEXTS = ["logo", "icon", "avatar"];
const MEDIA_KNOWN_CONTEXTS = [
  ...MEDIA_COVER_CONTEXTS,
  ...MEDIA_GALLERY_CONTEXTS,
  ...MEDIA_LOGO_CONTEXTS,
];

interface ListMediaInput extends ListInput {
  scope?: MediaScopeFilter;
  usage?: MediaUsageFilter;
}

export const listMediaCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListMediaInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    const scope: MediaScopeFilter = data?.scope === "mine" ? "mine" : "all";
    const usage: MediaUsageFilter = (
      ["cover", "gallery", "logo", "other"] as const
    ).includes(data?.usage as never)
      ? (data!.usage as MediaUsageFilter)
      : "all";

    let businessIds: string[] = [];
    let productIds: string[] = [];
    if (scope === "mine") {
      const { data: memberships, error: memberError } = await context.supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", context.userId)
        .eq("status", "active");
      if (memberError) throw memberError;
      businessIds = (memberships ?? []).map((m: { business_id: string }) => m.business_id);
      if (businessIds.length > 0) {
        const { data: products, error: productError } = await context.supabase
          .from("products")
          .select("id")
          .in("business_id", businessIds)
          .is("deleted_at", null);
        if (productError) throw productError;
        productIds = (products ?? []).map((p: { id: string }) => p.id);
      }
    }

    let q = context.supabase
      .from("media_assets")
      .select(
        "id, kind, storage_bucket, storage_path, alt_text, alt_text_ai, alt_text_source, review_state, entity_kind, entity_id, usage_context, mime_type, width, height, status, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("alt_text", `%${search}%`);

    if (scope === "mine") {
      const ownedIds = [...businessIds, ...productIds];
      const clauses = [`created_by.eq.${context.userId}`];
      if (ownedIds.length > 0) clauses.push(`entity_id.in.(${ownedIds.join(",")})`);
      q = q.or(clauses.join(","));
    }

    if (usage === "other") {
      q = q.or(
        `usage_context.is.null,usage_context.not.in.(${MEDIA_KNOWN_CONTEXTS.join(",")})`,
      );
    } else if (usage !== "all") {
      const list =
        usage === "cover"
          ? MEDIA_COVER_CONTEXTS
          : usage === "gallery"
            ? MEDIA_GALLERY_CONTEXTS
            : MEDIA_LOGO_CONTEXTS;
      q = q.in("usage_context", list);
    }

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset, scope, usage };
  });


/* ─────────────────────────────  Reseñas  ──────────────────────────────── */

export const listReviewsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("reviews")
      .select(
        "id, subject_kind, subject_id, author_display_name, rating, title, status, language, created_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ─────────────────────────────  Eventos  ─────────────────────────────── */

export const listEventsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("events")
      .select("id, slug, title, status, destination_id, starts_at, is_free, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("starts_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ─────────────────  Rutas / Itinerarios editoriales (Lote 3C)  ────────── */

/**
 * listEditorialRoutesCms — Listado administrativo de rutas editoriales.
 * Autoridad CMS-first: la superficie pública sólo lee lo publicado aquí.
 */
export const listEditorialRoutesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("editorial_routes")
      .select("id, slug, name, status, duration_days, region_slug, updated_at", {
        count: "exact",
      })
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });
