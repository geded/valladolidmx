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

type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

const EDITABLE_TABLES = [
  "tourism_regions",
  "destinations",
  "destination_zones",
  "business_categories",
  "businesses",
  "products",
] as const;
type EditableTable = (typeof EDITABLE_TABLES)[number];

const EDITABLE_COLUMNS: Record<EditableTable, readonly string[]> = {
  tourism_regions: ["slug", "name", "description", "sort_order", "metadata"],
  destinations: ["tourism_region_id", "slug", "name", "description", "metadata"],
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
    "metadata",
  ],
  products: [
    "business_id",
    "slug",
    "name",
    "description",
    "product_type",
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
    await assertEditorial(context);
    assertEditableTable(data.table);
    const clean = sanitizePayload(data.table, data.payload);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    if (data.id) {
      const { data: row, error } = await db
        .from(data.table)
        .update({ ...clean, updated_by: context.userId })
        .eq("id", data.id)
        .is("deleted_at", null)
        .select("id")
        .single();
      if (error) throw error;
      return { id: row.id as string, mode: "update" as const };
    }

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
    return { id: row.id as string, mode: "insert" as const };
  });

/* ──────────────────  Transición de estado editorial  ────────────────── */

const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["archived", "draft"],
  archived: ["draft"],
};

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
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(data.to)) {
      throw new Error(`invalid_transition:${from}->${data.to}`);
    }

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
