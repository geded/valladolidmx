/**
 * portal/business-card.functions.ts — Ficha pública editable y workflow
 * editorial (Ola 3 · Etapa 3 · Plan 14.30).
 *
 * Garantías:
 *  - Toda escritura usa requireSupabaseAuth (RLS aplica como user).
 *  - Lectura/escritura de `businesses` ya están protegidas por RLS:
 *      · select público sólo si status='published'
 *      · all: has_business_access(editor) OR is_admin
 *  - Doble verificación server-side via has_business_access antes de
 *    cualquier UPDATE.
 *  - Solicitud/retiro de revisión vía RPC SECURITY DEFINER dedicadas
 *    (`request_business_review`, `withdraw_business_review`) — owners y
 *    editores no necesitan rol editorial global.
 *  - Aprobación/publicación permanecen reservadas al CMS (Gate D) vía
 *    `transition_content_status` (extendida para entity_kind='business').
 *  - Sin SUPABASE_SERVICE_ROLE_KEY.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BusinessContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export interface PortalBusinessCard {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  tagline: string | null;
  description: string | null;
  status: BusinessContentStatus;
  verified: boolean;
  destination_id: string;
  primary_category_id: string | null;
  published_at: string | null;
  updated_at: string;
}

export interface BusinessAuditEntry {
  id: string;
  action: string;
  from_status: BusinessContentStatus | null;
  to_status: BusinessContentStatus | null;
  notes: string | null;
  created_at: string;
  actor_user_id: string | null;
}

const ALLOWED_FIELDS = [
  "display_name",
  "legal_name",
  "tagline",
  "description",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

function assertBusinessId(input: unknown): string {
  if (!input || typeof input !== "object") throw new Error("invalid_input");
  const id = (input as { businessId?: unknown }).businessId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_business");
  return id;
}

/**
 * getBusinessCard — Devuelve la ficha editable de una empresa para el
 * Portal. RLS exige al menos `editor` (o admin) para leer estados no
 * publicados; aquí además verificamos acceso explícitamente.
 */
export const getBusinessCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string }) => ({
    businessId: assertBusinessId(input),
  }))
  .handler(async ({ data, context }): Promise<PortalBusinessCard> => {
    const { supabase, userId } = context;
    const { data: allowed, error: accErr } = await supabase.rpc(
      "has_business_access",
      {
        _user_id: userId,
        _business_id: data.businessId,
        _min_role: "viewer",
      },
    );
    if (accErr) throw new Error(`access_check_failed: ${accErr.message}`);
    if (!allowed) throw new Error("forbidden_business_access");

    const { data: row, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, display_name, legal_name, tagline, description, status, verified, destination_id, primary_category_id, published_at, updated_at, deleted_at",
      )
      .eq("id", data.businessId)
      .single();
    if (error) throw new Error(`get_business_failed: ${error.message}`);
    if (!row || (row as { deleted_at: string | null }).deleted_at) {
      throw new Error("business_not_found");
    }
    const { deleted_at: _ignored, ...card } = row as PortalBusinessCard & {
      deleted_at: string | null;
    };
    return card;
  });

/**
 * updateBusinessCard — Actualiza un subconjunto blanco de campos
 * editoriales de la ficha. No modifica slug, destination, categorías,
 * status, verified ni published_at. Esos campos quedan reservados al CMS.
 */
export const updateBusinessCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      businessId: string;
      patch: Partial<Record<AllowedField, string | null>>;
    }) => {
      const businessId = assertBusinessId(input);
      if (!input.patch || typeof input.patch !== "object")
        throw new Error("invalid_patch");
      const cleaned: Partial<Record<AllowedField, string | null>> = {};
      for (const key of ALLOWED_FIELDS) {
        if (!(key in input.patch)) continue;
        const raw = input.patch[key];
        if (raw === null || raw === undefined) {
          cleaned[key] = null;
          continue;
        }
        if (typeof raw !== "string") throw new Error(`invalid_field:${key}`);
        const trimmed = raw.trim();
        if (key === "display_name") {
          if (trimmed.length < 2 || trimmed.length > 160)
            throw new Error("invalid_display_name");
          cleaned[key] = trimmed;
        } else if (key === "tagline") {
          if (trimmed.length > 220) throw new Error("invalid_tagline");
          cleaned[key] = trimmed.length ? trimmed : null;
        } else if (key === "legal_name") {
          if (trimmed.length > 220) throw new Error("invalid_legal_name");
          cleaned[key] = trimmed.length ? trimmed : null;
        } else if (key === "description") {
          if (trimmed.length > 8000) throw new Error("invalid_description");
          cleaned[key] = trimmed.length ? trimmed : null;
        }
      }
      if (Object.keys(cleaned).length === 0) throw new Error("empty_patch");
      return { businessId, patch: cleaned };
    },
  )
  .handler(async ({ data, context }): Promise<PortalBusinessCard> => {
    const { supabase, userId } = context;
    const { data: allowed, error: accErr } = await supabase.rpc(
      "has_business_access",
      {
        _user_id: userId,
        _business_id: data.businessId,
        _min_role: "editor",
      },
    );
    if (accErr) throw new Error(`access_check_failed: ${accErr.message}`);
    if (!allowed) throw new Error("forbidden_business_access");

    // display_name must remain non-null. Drop null assignments.
    const sanitized: Record<string, string | null> = { ...data.patch };
    if (sanitized.display_name === null) delete sanitized.display_name;
    const patch = {
      ...sanitized,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>;

    const { data: row, error } = await supabase
      .from("businesses")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.businessId)
      .is("deleted_at", null)
      .select(
        "id, slug, display_name, legal_name, tagline, description, status, verified, destination_id, primary_category_id, published_at, updated_at",
      )
      .single();
    if (error) throw new Error(`update_business_failed: ${error.message}`);
    return row as PortalBusinessCard;
  });

/**
 * requestBusinessReview — Envía la ficha (status='draft') a revisión
 * editorial. RPC SECURITY DEFINER valida acceso y transición.
 */
export const requestBusinessReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; notes?: string | null }) => ({
    businessId: assertBusinessId(input),
    notes:
      typeof input.notes === "string" && input.notes.trim().length
        ? input.notes.trim().slice(0, 1000)
        : null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const args: { _business_id: string; _notes?: string } = {
      _business_id: data.businessId,
    };
    if (data.notes) args._notes = data.notes;
    const { error } = await supabase.rpc("request_business_review", args);
    if (error) throw new Error(error.message ?? "request_review_failed");
    return { ok: true };
  });

/**
 * withdrawBusinessReview — Retira una solicitud pendiente
 * (status='in_review') y la regresa a draft. Sólo si el CMS aún no ha
 * aprobado.
 */
export const withdrawBusinessReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; notes?: string | null }) => ({
    businessId: assertBusinessId(input),
    notes:
      typeof input.notes === "string" && input.notes.trim().length
        ? input.notes.trim().slice(0, 1000)
        : null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const args: { _business_id: string; _notes?: string } = {
      _business_id: data.businessId,
    };
    if (data.notes) args._notes = data.notes;
    const { error } = await supabase.rpc("withdraw_business_review", args);
    if (error) throw new Error(error.message ?? "withdraw_review_failed");
    return { ok: true };
  });

/**
 * listBusinessAuditLog — Devuelve el historial de transiciones de la
 * ficha. RLS de content_audit_log limita la lectura a editores/admin y
 * a quienes tengan acceso editor a la entidad referenciada (políticas
 * existentes de Fase 1). El filtro server-side scope-tija la consulta.
 */
export const listBusinessAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; limit?: number }) => ({
    businessId: assertBusinessId(input),
    limit: Math.min(Math.max(input.limit ?? 25, 1), 100),
  }))
  .handler(async ({ data, context }): Promise<BusinessAuditEntry[]> => {
    const { supabase, userId } = context;
    const { data: allowed, error: accErr } = await supabase.rpc(
      "has_business_access",
      {
        _user_id: userId,
        _business_id: data.businessId,
        _min_role: "viewer",
      },
    );
    if (accErr) throw new Error(`access_check_failed: ${accErr.message}`);
    if (!allowed) throw new Error("forbidden_business_access");

    const { data: rows, error } = await supabase
      .from("content_audit_log")
      .select(
        "id, action, from_status, to_status, notes, created_at, actor_user_id",
      )
      .eq("entity_kind", "business")
      .eq("entity_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(`audit_log_failed: ${error.message}`);
    return (rows ?? []) as BusinessAuditEntry[];
  });