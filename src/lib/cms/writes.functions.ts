/**
 * cms/writes.functions.ts — Mutaciones del CMS Studio (Ola 1 · Etapa 3).
 *
 * Reglas obligatorias:
 *  - Toda operación pasa por `requireSupabaseAuth` (RLS aplica como el usuario).
 *  - Validación server-side adicional vía RPC `is_editor_or_admin` antes de
 *    cualquier escritura.
 *  - NO se usa `supabaseAdmin` para operaciones editoriales normales.
 *  - NO se modifican políticas RLS ni el modelo de dominio.
 *  - `status` NUNCA se mueve mediante upsert. Toda transición pasa por
 *    `transitionEntityStatus`, que aplica la máquina oficial Serie 14:
 *    draft → in_review → approved → published → archived.
 *  - `created_by` / `updated_by` se completan con `context.userId` para dejar
 *    trazabilidad lista para auditoría (historial formal en una ola posterior).
 *  - No se ejecutan publicaciones automáticas: `published` sólo se alcanza por
 *    transición explícita autorizada en este endpoint.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAllowedTransition,
  type ContentStatus,
} from "@/lib/cms/workflow";

const EDITABLE_TABLES = [
  "tourism_regions",
  "destinations",
  "destination_zones",
  "business_categories",
  "businesses",
  "products",
] as const;
type EditableTable = (typeof EDITABLE_TABLES)[number];

/**
 * Mapeo tabla → entity_kind oficial (enum del dominio, Serie 11).
 * Indispensable para registrar `content_audit_log` desde las server
 * functions del CMS Studio sin modificar el modelo de dominio.
 */
const TABLE_TO_ENTITY_KIND: Record<
  EditableTable,
  | "tourism_region"
  | "destination"
  | "destination_zone"
  | "business_category"
  | "business"
  | "product"
> = {
  tourism_regions: "tourism_region",
  destinations: "destination",
  destination_zones: "destination_zone",
  business_categories: "business_category",
  businesses: "business",
  products: "product",
};

const EDITABLE_COLUMNS: Record<EditableTable, readonly string[]> = {
  tourism_regions: ["state_id", "slug", "name", "tagline", "description", "metadata"],
  destinations: [
    "tourism_region_id",
    "slug",
    "name",
    "tagline",
    "description",
    "highlights",
    "hero_palette",
    "hero_media_id",
    "latitude",
    "longitude",
    "metadata",
  ],
  destination_zones: ["destination_id", "slug", "name", "description", "metadata"],
  business_categories: [
    "parent_id",
    "slug",
    "name",
    "description",
    "icon",
    "sort_order",
    "metadata",
  ],
  businesses: [
    "destination_id",
    "primary_category_id",
    "slug",
    "legal_name",
    "display_name",
    "tagline",
    "description",
    "verified",
    "logo_media_id",
    "cover_media_id",
    "metadata",
  ],
  products: [
    "business_id",
    "slug",
    "name",
    "tagline",
    "description",
    "product_type",
    "price_amount",
    "price_currency",
    "duration_minutes",
    "capacity",
    "cover_media_id",
    "metadata",
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

/**
 * assertCanEditBusiness — Autoriza a admins/editores O a dueños (>= editor
 * en `business_users`) para operar sobre una empresa existente. Para
 * creación (`businessId` ausente) sólo permite admins/editores.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCanEditBusiness(
  context: { supabase: any; userId: string },
  businessId?: string | null,
) {
  const { data: editorial } = await context.supabase.rpc(
    "is_editor_or_admin",
    { _user_id: context.userId },
  );
  if (editorial) return;
  if (!businessId) throw new Error("forbidden");
  const { data: owns } = await context.supabase.rpc("has_business_access", {
    _user_id: context.userId,
    _business_id: businessId,
    _min_role: "editor",
  });
  if (!owns) throw new Error("forbidden");
}

/**
 * assertCanEditProduct — Admite admins/editores O dueños (≥editor) de la
 * empresa asociada. Para creación deriva business_id del payload; para
 * actualización lo resuelve leyendo la fila.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCanEditProduct(
  context: { supabase: any; userId: string },
  productId: string | null,
  payload: Record<string, unknown>,
) {
  const { data: editorial } = await context.supabase.rpc(
    "is_editor_or_admin",
    { _user_id: context.userId },
  );
  if (editorial) return;
  let businessId = (payload.business_id as string | undefined) ?? null;
  if (!businessId && productId) {
    const { data: row } = await context.supabase
      .from("products")
      .select("business_id")
      .eq("id", productId)
      .maybeSingle();
    businessId = (row?.business_id as string | undefined) ?? null;
  }
  if (!businessId) throw new Error("forbidden");
  const { data: owns } = await context.supabase.rpc("has_business_access", {
    _user_id: context.userId,
    _business_id: businessId,
    _min_role: "editor",
  });
  if (!owns) throw new Error("forbidden");
}

function assertEditableTable(t: string): asserts t is EditableTable {
  if (!(EDITABLE_TABLES as readonly string[]).includes(t)) {
    throw new Error(`table_not_editable:${t}`);
  }
}

function sanitizePayload(table: EditableTable, payload: Record<string, unknown>) {
  const allowed = EDITABLE_COLUMNS[table];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in payload) out[k] = payload[k];
  }
  return out;
}

/* ─────────────────  Capa conceptual reservada  ─────────────────────── */
/**
 * assertBusinessRules — Hook arquitectónico reservado (Ola 1 · Etapa 4).
 *
 * Ubicación oficial: DESPUÉS de `sanitizePayload()` y ANTES de la
 * persistencia. Su propósito es concentrar futuras reglas de negocio
 * (invariantes cruzados, validaciones semánticas, restricciones de
 * dominio) sin modificar la arquitectura existente ni acoplarlas a la
 * UI, a RLS o a triggers de base de datos.
 *
 * En esta etapa NO ejecuta validaciones: queda intencionalmente como
 * no-op para evitar cambios funcionales hasta que cada regla sea
 * documentada y aprobada en una ola posterior.
 */
async function assertBusinessRules(
  _table: EditableTable,
  _mode: "insert" | "update",
  _payload: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _context: { supabase: any; userId: string },
): Promise<void> {
  return;
}

/* ─────────────────────────  Auditoría CMS  ─────────────────────────── */
/**
 * Registra una entrada en `content_audit_log` reutilizando la política
 * RLS existente `content_audit_editor_insert` (solo editores/admins).
 * No modifica RLS ni el esquema. Los errores se silencian para que el
 * fallo de auditoría nunca tumbe la operación editorial.
 */
async function logCmsAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: {
    table: EditableTable;
    entityId: string;
    action: "created" | "updated" | "transition";
    fromStatus?: ContentStatus | null;
    toStatus?: ContentStatus | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await db.from("content_audit_log").insert({
      entity_kind: TABLE_TO_ENTITY_KIND[params.table],
      entity_id: params.entityId,
      action: params.action,
      from_status: params.fromStatus ?? null,
      to_status: params.toStatus ?? null,
      notes: params.notes ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // intencional: no romper la operación si auditoría falla
  }
}

/* ─────────────────────────  Upsert genérico  ────────────────────────── */

interface UpsertInput {
  table: string;
  id?: string | null;
  payload: Record<string, unknown>;
}

export const upsertCmsEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpsertInput) => {
    if (!d || typeof d !== "object") throw new Error("invalid_input");
    if (typeof d.table !== "string") throw new Error("invalid_table");
    if (!d.payload || typeof d.payload !== "object")
      throw new Error("invalid_payload");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertEditableTable(data.table);
    if (data.table === "businesses") {
      await assertCanEditBusiness(context, data.id ?? null);
    } else if (data.table === "products") {
      await assertCanEditProduct(context, data.id ?? null, data.payload);
    } else {
      await assertEditorial(context);
    }
    const clean = sanitizePayload(data.table, data.payload);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    if (data.id) {
      await assertBusinessRules(data.table, "update", clean, context);
      const { data: row, error } = await db
        .from(data.table)
        .update({ ...clean, updated_by: context.userId })
        .eq("id", data.id)
        .is("deleted_at", null)
        .select("id")
        .single();
      if (error) throw error;
      await logCmsAudit(db, {
        table: data.table,
        entityId: row.id as string,
        action: "updated",
        metadata: { fields: Object.keys(clean) },
      });
      return { id: row.id as string, mode: "update" as const };
    }

    await assertBusinessRules(data.table, "insert", clean, context);
    const { data: row, error } = await db
      .from(data.table)
      .insert({
        ...clean,
        status: "draft",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    await logCmsAudit(db, {
      table: data.table,
      entityId: row.id as string,
      action: "created",
      toStatus: "draft",
    });
    return { id: row.id as string, mode: "insert" as const };
  });

/* ──────────────────  Transición de estado editorial  ────────────────── */

interface TransitionInput {
  table: string;
  id: string;
  to: ContentStatus;
  notes?: string;
}

export const transitionEntityStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TransitionInput) => {
    if (!d?.table || !d?.id || !d?.to) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    assertEditableTable(data.table);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: current, error: readErr } = await db
      .from(data.table)
      .select("id, status")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (readErr) throw readErr;
    if (!current) throw new Error("not_found");

    const from = current.status as ContentStatus;
    assertAllowedTransition(from, data.to);

    const patch: Record<string, unknown> = {
      status: data.to,
      updated_by: context.userId,
    };
    if (data.to === "published") {
      patch.published_at = new Date().toISOString();
    }

    const { error: updErr } = await db
      .from(data.table)
      .update(patch)
      .eq("id", data.id);
    if (updErr) throw updErr;

    await logCmsAudit(db, {
      table: data.table,
      entityId: data.id,
      action: "transition",
      fromStatus: from,
      toStatus: data.to,
      notes: data.notes ?? null,
    });

    return { id: data.id, from, to: data.to };
  });

/* ──────────────────  Lectura puntual para edición  ──────────────────── */

interface GetByIdInput {
  table: string;
  id: string;
}

export const getCmsEntityById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: GetByIdInput) => {
    if (!d?.table || !d?.id) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    assertEditableTable(data.table);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: row, error } = await db
      .from(data.table)
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    // Devolvemos string-map plano para mantener serializabilidad estricta.
    return JSON.parse(JSON.stringify(row)) as Record<string, string | number | boolean | null>;
  });

/* ────────────  Historial editorial (Ola 1 · Etapa 4)  ──────────────── */

export interface CmsHistoryEntry {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_user_id: string | null;
  notes: string | null;
  created_at: string;
}

interface HistoryInput {
  table: string;
  id: string;
  limit?: number;
}

export const listEntityHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: HistoryInput) => {
    if (!d?.table || !d?.id) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }): Promise<CmsHistoryEntry[]> => {
    await assertEditorial(context);
    assertEditableTable(data.table);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const kind = TABLE_TO_ENTITY_KIND[data.table];
    const { data: rows, error } = await db
      .from("content_audit_log")
      .select(
        "id, action, from_status, to_status, actor_user_id, notes, created_at",
      )
      .eq("entity_kind", kind)
      .eq("entity_id", data.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 50, 200));
    if (error) throw error;
    return (rows ?? []) as CmsHistoryEntry[];
  });
