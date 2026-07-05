/**
 * related/overrides.functions.ts — E6 · Related Collection · Overrides
 *
 * Fuente única para pins/hides editoriales de la colección relacionada
 * en fichas de empresa, producto, destino y evento.
 *
 * - `getRelatedOverrides` (público, publishable-key): usado por los
 *   fetchers de superficie para excluir ítems ocultos y hacer prepend
 *   de ítems fijados. Es un GET simple con RLS pública SELECT.
 * - `listOverridesCms` / `upsertOverride` / `deleteOverride`
 *   (`requireSupabaseAuth` + `is_editor_or_admin`): CRUD para el
 *   panel administrativo (Workspace / CMS).
 *
 * Contrato preparado para E7 (Recommendation Engine): el shape de
 * salida NO cambia cuando E7 sustituya la lógica de reglas.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type RelatedEntityKind =
  | "business"
  | "product"
  | "destination"
  | "event";

export type RelatedOverrideMode = "pin" | "hide";

export interface RelatedOverrideRow {
  id: string;
  entity_type: RelatedEntityKind;
  entity_id: string;
  surface: string;
  related_entity_type: RelatedEntityKind;
  related_entity_id: string;
  mode: RelatedOverrideMode;
  position: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatedOverridesDTO {
  pins: RelatedOverrideRow[];
  hides: RelatedOverrideRow[];
}

const MAX_PINS_PER_SURFACE = 6;

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing_supabase_public_env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

function normalizeSurface(s: unknown): string {
  const v = typeof s === "string" ? s.trim() : "";
  if (!v) throw new Error("invalid_surface");
  return v;
}

function normalizeKind(k: unknown): RelatedEntityKind {
  if (k === "business" || k === "product" || k === "destination" || k === "event") return k;
  throw new Error("invalid_entity_kind");
}

/* ------------------------------------------------------------------ *
 * PUBLIC · Lectura para fetchers de superficie
 * ------------------------------------------------------------------ */
export const getRelatedOverrides = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { entityType: string; entityId: string; surface: string }) => {
      if (!data?.entityId || typeof data.entityId !== "string") {
        throw new Error("invalid_entity_id");
      }
      return {
        entityType: normalizeKind(data.entityType),
        entityId: data.entityId,
        surface: normalizeSurface(data.surface),
      };
    },
  )
  .handler(async ({ data }): Promise<RelatedOverridesDTO> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("related_overrides")
      .select(
        "id, entity_type, entity_id, surface, related_entity_type, related_entity_id, mode, position, note, created_at, updated_at",
      )
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .eq("surface", data.surface)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(`related_overrides_read_failed: ${error.message}`);
    const all = (rows ?? []) as RelatedOverrideRow[];
    return {
      pins: all.filter((r) => r.mode === "pin").slice(0, MAX_PINS_PER_SURFACE),
      hides: all.filter((r) => r.mode === "hide"),
    };
  });

/* ------------------------------------------------------------------ *
 * ADMIN · Listado
 * ------------------------------------------------------------------ */
export interface ListOverridesInput {
  entityType?: RelatedEntityKind;
  entityId?: string;
  surface?: string;
  limit?: number;
  offset?: number;
}

export const listOverridesCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ListOverridesInput | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const limit = Math.min(Math.max(Number(data.limit ?? 100), 1), 500);
    const offset = Math.max(Number(data.offset ?? 0), 0);
    let q = context.supabase
      .from("related_overrides")
      .select(
        "id, entity_type, entity_id, surface, related_entity_type, related_entity_id, mode, position, note, created_at, updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    if (data.entityId) q = q.eq("entity_id", data.entityId);
    if (data.surface) q = q.eq("surface", data.surface);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    return {
      rows: (rows ?? []) as RelatedOverrideRow[],
      total: count ?? 0,
      limit,
      offset,
    };
  });

/* ------------------------------------------------------------------ *
 * ADMIN · Upsert / Delete
 * ------------------------------------------------------------------ */
export interface UpsertOverrideInput {
  id?: string;
  entityType: RelatedEntityKind;
  entityId: string;
  surface: string;
  relatedEntityType: RelatedEntityKind;
  relatedEntityId: string;
  mode: RelatedOverrideMode;
  position?: number | null;
  note?: string | null;
}

export const upsertOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpsertOverrideInput) => {
    const entityType = normalizeKind(data.entityType);
    const relatedEntityType = normalizeKind(data.relatedEntityType);
    const surface = normalizeSurface(data.surface);
    if (!data.entityId) throw new Error("invalid_entity_id");
    if (!data.relatedEntityId) throw new Error("invalid_related_entity_id");
    if (data.mode !== "pin" && data.mode !== "hide") throw new Error("invalid_mode");
    if (entityType === relatedEntityType && data.entityId === data.relatedEntityId) {
      throw new Error("self_reference_forbidden");
    }
    return {
      id: typeof data.id === "string" && data.id ? data.id : undefined,
      entityType,
      entityId: data.entityId,
      surface,
      relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      mode: data.mode,
      position:
        typeof data.position === "number" && Number.isFinite(data.position)
          ? Math.max(0, Math.floor(data.position))
          : null,
      note: typeof data.note === "string" ? data.note.slice(0, 500) : null,
    };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const payload = {
      entity_type: data.entityType,
      entity_id: data.entityId,
      surface: data.surface,
      related_entity_type: data.relatedEntityType,
      related_entity_id: data.relatedEntityId,
      mode: data.mode,
      position: data.position,
      note: data.note,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("related_overrides")
      .upsert(payload, {
        onConflict:
          "entity_type,entity_id,surface,related_entity_type,related_entity_id",
      })
      .select("*")
      .single();
    if (error) throw new Error(`related_overrides_upsert_failed: ${error.message}`);
    return row as RelatedOverrideRow;
  });

export const deleteOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("invalid_id");
    return { id: data.id };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { error } = await context.supabase
      .from("related_overrides")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(`related_overrides_delete_failed: ${error.message}`);
    return { ok: true as const };
  });

/* ------------------------------------------------------------------ *
 * Helpers puros para fetchers de superficie
 * ------------------------------------------------------------------ */
export function computeHiddenIds(
  overrides: RelatedOverridesDTO,
  kind: RelatedEntityKind,
): Set<string> {
  const out = new Set<string>();
  for (const h of overrides.hides) {
    if (h.related_entity_type === kind) out.add(h.related_entity_id);
  }
  return out;
}

export function pinnedIdsFor(
  overrides: RelatedOverridesDTO,
  kind: RelatedEntityKind,
): string[] {
  return overrides.pins
    .filter((p) => p.related_entity_type === kind)
    .map((p) => p.related_entity_id);
}