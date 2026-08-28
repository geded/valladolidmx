/**
 * G8-Q2B · Server functions del CMS de Lugares y Atractivos.
 *
 * Reglas obligatorias:
 *  - Toda operación pasa por `requireSupabaseAuth` (RLS aplica como usuario).
 *  - Autorización adicional server-side: `is_editor_or_admin` o el permiso
 *    granular `poi.write`. Ninguna UI concede autoridad.
 *  - Alta gobernada por la RPC `admin_create_place` (siempre `draft`).
 *  - Campos protegidos (slug, nombre, destino, tipo, coordenadas, estado y
 *    publicación) nunca se aceptan en el patch libre del editor.
 *  - No se relaja RLS ni grants: toda denegación falla de forma explícita.
 *  - No se escribe contenido turístico real desde el código.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAllowedTransition, type ContentStatus } from "@/lib/cms/workflow";
import { ZONE_DESTINATION_MISMATCH, isSelectableZone } from "./place-territory";
import {
  attachPlaceMediaSchema,
  createPlaceCmsSchema,
  detachPlaceMediaSchema,
  isPlaceProtectedColumn,
  placeAdvanceBlockers,
  placeLocationSchema,
  placePublishBlockers,
  reorderPlaceMediaSchema,
  setPlaceAuthoritiesSchema,
  setPlaceCategoriesSchema,
  setPlaceEventsSchema,
  setPlaceHoursSchema,
  setPlaceProductsSchema,
  updatePlaceCmsSchema,
} from "./places-cms-contracts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Ctx = { supabase: any; userId: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const PLACE_SELECT =
  "id, slug, name, official_name, destination_id, destination_zone_id, place_type_id, status, " +
  "description, short_description, highlights, amenities, accessibility, directions, address_line, " +
  "google_place_id, visit_duration_minutes, best_time_to_visit, admission_kind, entry_fee_notes, " +
  "price_from, price_to, price_currency, contact_phone, contact_whatsapp, contact_email, " +
  "contact_website, social_links, latitude, longitude, published_at, created_at, updated_at";

/** Autorización dura: staff editorial o permiso granular `poi.write`. */
async function assertPlacesStaff(context: Ctx) {
  const editorial = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (editorial.error) throw new Error(`role_check_failed: ${editorial.error.message}`);
  if (editorial.data === true) return;
  const granular = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _permission_key: "poi.write",
  });
  if (granular.error || granular.data !== true) throw new Error("forbidden");
}

function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/**
 * Addendum Q2B · Coherencia territorial fail-closed.
 *
 * Rechaza cualquier `destination_zone_id` que no pertenezca al
 * `destination_id` del lugar. La validación visual del formulario no basta:
 * este es el único punto de verdad.
 */
async function assertZoneBelongsToDestination(
  ctx: Ctx,
  destinationId: string,
  zoneId: string | null | undefined,
) {
  if (!zoneId) return;
  if (!destinationId) throw new Error(ZONE_DESTINATION_MISMATCH);
  const zone = unwrap(
    await ctx.supabase
      .from("destination_zones")
      .select("id, destination_id, status")
      .eq("id", zoneId)
      .is("deleted_at", null)
      .maybeSingle(),
  ) as { id: string; destination_id: string; status: string | null } | null;
  if (!zone) throw new Error(ZONE_DESTINATION_MISMATCH);
  if (zone.destination_id !== destinationId) throw new Error(ZONE_DESTINATION_MISMATCH);
  if (!isSelectableZone({ id: zone.id, name: "", destination_id: zone.destination_id, status: zone.status }))
    throw new Error(ZONE_DESTINATION_MISMATCH);
}

/* ───────────────────────────────  Lecturas  ─────────────────────────────── */

interface ListPlacesInput {
  search?: string;
  destinationId?: string;
  /** Addendum Q2B: filtro territorial de segundo nivel (zona del destino). */
  destinationZoneId?: string;
  placeTypeId?: string;
  categoryId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const listPlacesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListPlacesInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertPlacesStaff(context as Ctx);
    const limit = Math.min(Math.max(Number(data.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
    const offset = Math.max(Number(data.offset ?? 0), 0);
    const search = (data.search ?? "").trim();

    let placeIdFilter: string[] | null = null;
    if (data.categoryId) {
      const links = unwrap(
        await (context as Ctx).supabase
          .from("place_category_links")
          .select("place_id")
          .eq("category_id", data.categoryId),
      ) as Array<{ place_id: string }>;
      placeIdFilter = links.map((l) => l.place_id);
      if (placeIdFilter.length === 0)
        return { rows: [], total: 0, limit, offset };
    }

    let q = (context as Ctx).supabase
      .from("points_of_interest")
      .select(
        "id, slug, name, status, destination_id, destination_zone_id, place_type_id, latitude, longitude, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    if (data.destinationId) q = q.eq("destination_id", data.destinationId);
    if (data.destinationZoneId) q = q.eq("destination_zone_id", data.destinationZoneId);
    if (data.placeTypeId) q = q.eq("place_type_id", data.placeTypeId);
    if (data.status) q = q.eq("status", data.status);
    if (placeIdFilter) q = q.in("id", placeIdFilter);

    const { data: rows, count, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, limit, offset };
  });

export const listPlaceFormOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const [destinations, zones, types, categories, authorityKinds] = await Promise.all([
      ctx.supabase
        .from("destinations")
        .select("id, name, slug")
        .is("deleted_at", null)
        .order("name"),
      // Addendum Q2B: sólo zonas vivas; el filtrado por destino ocurre con
      // `zonesForDestination` en el formulario y se revalida en el servidor.
      ctx.supabase
        .from("destination_zones")
        .select("id, name, destination_id, status")
        .is("deleted_at", null)
        .neq("status", "archived")
        .order("name"),
      ctx.supabase
        .from("place_types")
        .select("id, slug, name")
        .eq("is_active", true)
        .order("sort_order"),
      ctx.supabase
        .from("place_categories")
        .select("id, slug, name")
        .eq("is_active", true)
        .order("sort_order"),
      ctx.supabase
        .from("place_authority_kinds")
        .select("id, slug, name")
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    return {
      destinations: unwrap(destinations) ?? [],
      zones: unwrap(zones) ?? [],
      placeTypes: unwrap(types) ?? [],
      categories: unwrap(categories) ?? [],
      authorityKinds: unwrap(authorityKinds) ?? [],
    };
  });

export const getPlaceCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const place = unwrap(
      await ctx.supabase
        .from("points_of_interest")
        .select(PLACE_SELECT)
        .eq("id", data.placeId)
        .is("deleted_at", null)
        .maybeSingle(),
    );
    if (!place) throw new Error("place_not_found");

    const [categories, hours, media, products, events, authorities] = await Promise.all([
      ctx.supabase.from("place_category_links").select("category_id").eq("place_id", data.placeId),
      ctx.supabase
        .from("place_hours")
        .select("id, day_of_week, opens_at, closes_at, is_closed, notes")
        .eq("place_id", data.placeId)
        .order("day_of_week"),
      ctx.supabase
        .from("place_media")
        .select("id, media_asset_id, role, sort_order")
        .eq("place_id", data.placeId)
        .order("sort_order"),
      ctx.supabase
        .from("place_products")
        .select("id, product_id, relation_kind, sort_order")
        .eq("place_id", data.placeId)
        .order("sort_order"),
      ctx.supabase
        .from("place_events")
        .select("id, event_id, relation_kind, sort_order")
        .eq("place_id", data.placeId)
        .order("sort_order"),
      ctx.supabase
        .from("place_authorities")
        .select("id, authority_kind_id, business_id, authority_name, is_primary, notes")
        .eq("place_id", data.placeId),
    ]);

    const mediaRows = (unwrap(media) ?? []) as Array<{ media_asset_id: string }>;
    let assets: Array<{ id: string; storage_path: string; alt_text: string | null; review_state: string | null; status: string | null }> = [];
    if (mediaRows.length > 0) {
      assets = (unwrap(
        await ctx.supabase
          .from("media_assets")
          .select("id, storage_path, alt_text, review_state, status")
          .in("id", mediaRows.map((r) => r.media_asset_id)),
      ) ?? []) as typeof assets;
    }

    return {
      place,
      categoryIds: ((unwrap(categories) ?? []) as Array<{ category_id: string }>).map(
        (r) => r.category_id,
      ),
      hours: unwrap(hours) ?? [],
      media: unwrap(media) ?? [],
      assets,
      products: unwrap(products) ?? [],
      events: unwrap(events) ?? [],
      authorities: unwrap(authorities) ?? [],
    };
  });

export const checkPlaceDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => ({ name: (d?.name ?? "").trim() }))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    if (data.name.length < 3) return { warnings: [] };
    const { data: rows, error } = await ctx.supabase.rpc("place_duplicate_warnings", {
      _name: data.name,
    });
    if (error) throw new Error(error.message);
    return { warnings: rows ?? [] };
  });

/* ───────────────────────────────  Escrituras  ───────────────────────────── */

export const createPlaceCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPlaceCmsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    // Addendum Q2B: la coherencia destino–zona se verifica ANTES de crear.
    await assertZoneBelongsToDestination(ctx, data.destination_id, data.destination_zone_id);
    const { data: id, error } = await ctx.supabase.rpc("admin_create_place", {
      _destination_id: data.destination_id,
      _slug: data.slug,
      _name: data.name,
      _place_type_id: data.place_type_id,
      _description: data.description ?? null,
    });
    if (error) throw new Error(error.message);
    const placeId = id as string;
    if (data.destination_zone_id) {
      const zoneUpdate = await ctx.supabase
        .from("points_of_interest")
        .update({ destination_zone_id: data.destination_zone_id, updated_by: ctx.userId })
        .eq("id", placeId)
        .select("id")
        .maybeSingle();
      if (zoneUpdate.error) throw new Error(zoneUpdate.error.message);
      if (!zoneUpdate.data) throw new Error("update_denied");
    }
    return { id: placeId, status: "draft" as const };
  });

export const updatePlaceCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePlaceCmsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);

    for (const key of Object.keys(data.patch)) {
      if (isPlaceProtectedColumn(key)) throw new Error(`protected_field:${key}`);
    }

    const current = unwrap(
      await ctx.supabase
        .from("points_of_interest")
        .select("id, updated_at")
        .eq("id", data.place_id)
        .is("deleted_at", null)
        .maybeSingle(),
    ) as { id: string; updated_at: string } | null;
    if (!current) throw new Error("place_not_found");
    if (new Date(current.updated_at).getTime() !== new Date(data.expected_updated_at).getTime())
      throw new Error("conflict_stale_record");

    const payload: Record<string, unknown> = { ...data.patch, updated_by: ctx.userId };
    const { data: updated, error } = await ctx.supabase
      .from("points_of_interest")
      .update(payload)
      .eq("id", data.place_id)
      .select("id, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("update_denied");
    return updated as { id: string; updated_at: string };
  });

export const setPlaceLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => placeLocationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const { data: updated, error } = await ctx.supabase
      .from("points_of_interest")
      .update({
        latitude: data.latitude,
        longitude: data.longitude,
        updated_by: ctx.userId,
      })
      .eq("id", data.place_id)
      .select("id, latitude, longitude, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("update_denied");
    return updated;
  });

export const setPlaceType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { place_id: string; place_type_id: string }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const { error } = await ctx.supabase.rpc("admin_update_place_details", {
      _place_id: data.place_id,
      _patch: { place_type_id: data.place_type_id },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPlaceCategoriesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlaceCategoriesSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const { error } = await ctx.supabase.rpc("admin_set_place_categories", {
      _place_id: data.place_id,
      _category_ids: data.category_ids,
    });
    if (error) throw new Error(error.message);
    return { ok: true, count: data.category_ids.length };
  });

export const setPlaceHoursCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlaceHoursSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const del = await ctx.supabase.from("place_hours").delete().eq("place_id", data.place_id);
    if (del.error) throw new Error(del.error.message);
    if (data.hours.length > 0) {
      const ins = await ctx.supabase.from("place_hours").insert(
        data.hours.map((h) => ({
          place_id: data.place_id,
          day_of_week: h.day_of_week,
          opens_at: h.is_closed ? null : h.opens_at,
          closes_at: h.is_closed ? null : h.closes_at,
          is_closed: h.is_closed,
          notes: h.notes ?? null,
        })),
      );
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true, count: data.hours.length };
  });

export const setPlaceProductsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlaceProductsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const del = await ctx.supabase.from("place_products").delete().eq("place_id", data.place_id);
    if (del.error) throw new Error(del.error.message);
    if (data.relations.length > 0) {
      const ins = await ctx.supabase
        .from("place_products")
        .insert(data.relations.map((r) => ({ ...r, place_id: data.place_id })));
      if (ins.error) throw new Error(ins.error.message);
    }
    // Nota Q2B: relacionar un producto NO otorga administración del lugar.
    return { ok: true, count: data.relations.length, grantsPlaceAdministration: false };
  });

export const setPlaceEventsCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlaceEventsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const del = await ctx.supabase.from("place_events").delete().eq("place_id", data.place_id);
    if (del.error) throw new Error(del.error.message);
    if (data.relations.length > 0) {
      const ins = await ctx.supabase
        .from("place_events")
        .insert(data.relations.map((r) => ({ ...r, place_id: data.place_id })));
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true, count: data.relations.length, grantsPlaceAdministration: false };
  });

export const setPlaceAuthoritiesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlaceAuthoritiesSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const del = await ctx.supabase.from("place_authorities").delete().eq("place_id", data.place_id);
    if (del.error) throw new Error(del.error.message);
    if (data.authorities.length > 0) {
      const ins = await ctx.supabase
        .from("place_authorities")
        .insert(data.authorities.map((a) => ({ ...a, place_id: data.place_id })));
      if (ins.error) throw new Error(ins.error.message);
    }
    // Informativo: no crea gestores ni reclamación empresarial.
    return { ok: true, count: data.authorities.length, grantsPlaceAdministration: false };
  });

/* ─────────────────────────────────  Medios  ─────────────────────────────── */

export const attachPlaceMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attachPlaceMediaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const asset = unwrap(
      await ctx.supabase
        .from("media_assets")
        .select("id, review_state, status")
        .eq("id", data.media_asset_id)
        .maybeSingle(),
    ) as { id: string; review_state: string | null; status: string | null } | null;
    if (!asset) throw new Error("media_asset_not_found");

    if (data.role === "cover") {
      const del = await ctx.supabase
        .from("place_media")
        .delete()
        .eq("place_id", data.place_id)
        .eq("role", "cover");
      if (del.error) throw new Error(del.error.message);
    }
    const { data: row, error } = await ctx.supabase
      .from("place_media")
      .insert({
        place_id: data.place_id,
        media_asset_id: data.media_asset_id,
        role: data.role,
        sort_order: data.role === "cover" ? 0 : 100,
      })
      .select("id, media_asset_id, role, sort_order")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { row, approved: asset.review_state === "approved" };
  });

export const detachPlaceMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => detachPlaceMediaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    const { error } = await ctx.supabase
      .from("place_media")
      .delete()
      .eq("id", data.media_id)
      .eq("place_id", data.place_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderPlaceMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reorderPlaceMediaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);
    let index = 0;
    for (const mediaId of data.ordered_media_ids) {
      const { error } = await ctx.supabase
        .from("place_media")
        .update({ sort_order: index })
        .eq("id", mediaId)
        .eq("place_id", data.place_id);
      if (error) throw new Error(error.message);
      index += 1;
    }
    return { ok: true };
  });

/* ────────────────────────────  Workflow editorial  ──────────────────────── */

export const transitionPlaceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { place_id: string; to: ContentStatus }) => d)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertPlacesStaff(ctx);

    const place = unwrap(
      await ctx.supabase
        .from("points_of_interest")
        .select("id, status, latitude, longitude, place_type_id, short_description")
        .eq("id", data.place_id)
        .is("deleted_at", null)
        .maybeSingle(),
    ) as {
      status: ContentStatus;
      latitude: number | null;
      longitude: number | null;
      place_type_id: string | null;
      short_description: string | null;
    } | null;
    if (!place) throw new Error("place_not_found");
    assertAllowedTransition(place.status, data.to);

    if (data.to !== "draft" && data.to !== "archived") {
      const links = (unwrap(
        await ctx.supabase.from("place_media").select("media_asset_id").eq("place_id", data.place_id),
      ) ?? []) as Array<{ media_asset_id: string }>;
      let hasUnapprovedMedia = false;
      if (links.length > 0) {
        const assets = (unwrap(
          await ctx.supabase
            .from("media_assets")
            .select("id, review_state")
            .in("id", links.map((l) => l.media_asset_id)),
        ) ?? []) as Array<{ review_state: string | null }>;
        hasUnapprovedMedia = assets.some((a) => a.review_state !== "approved");
      }
      const guard = {
        latitude: place.latitude,
        longitude: place.longitude,
        placeTypeId: place.place_type_id,
        shortDescription: place.short_description,
        hasUnapprovedMedia,
      };
      const blockers =
        data.to === "published" ? placePublishBlockers(guard) : placeAdvanceBlockers(guard);
      if (blockers.length > 0) throw new Error(`blocked:${blockers.join(" · ")}`);
    }

    const patch: Record<string, unknown> = { status: data.to, updated_by: ctx.userId };
    if (data.to === "published") patch.published_at = new Date().toISOString();
    const { data: updated, error } = await ctx.supabase
      .from("points_of_interest")
      .update(patch)
      .eq("id", data.place_id)
      .select("id, status, published_at, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("transition_denied");
    return updated;
  });
