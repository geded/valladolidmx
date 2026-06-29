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

async function assertEditorial(context: {
  supabase: ReturnType<typeof Object>;
  userId: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = context.supabase as any;
  const { data, error } = await sb.rpc("is_editor_or_admin", {
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
      .select(
        "id, slug, display_name, status, verified, destination_id, updated_at",
        { count: "exact" },
      )
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
      .select(
        "id, slug, name, product_type, status, business_id, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

/* ─────────────────────────────  Media  ────────────────────────────────── */

export const listMediaCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { limit, offset, search } = normalizeInput(data);
    let q = context.supabase
      .from("media_assets")
      .select(
        "id, kind, storage_bucket, storage_path, alt_text, mime_type, width, height, status, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("alt_text", `%${search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
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