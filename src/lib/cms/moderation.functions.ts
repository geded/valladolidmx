/**
 * cms/moderation.functions.ts — Moderación de reseñas (Ola 1 · Etapa 5).
 *
 * Reglas obligatorias:
 *  - Toda operación requiere `requireSupabaseAuth` y validación server-side
 *    de rol `admin` mediante RPC `is_admin`. Las políticas RLS actuales de
 *    `public.reviews` ya restringen las mutaciones de moderación a admins
 *    (`reviews admin manage`); el doble cinturón (RPC + RLS) se mantiene
 *    intencionalmente para defensa en profundidad.
 *  - NO se modifican políticas RLS.
 *  - NO se modifica el modelo de dominio (sin migraciones, sin nuevas
 *    columnas, sin nuevos enums).
 *  - NO se usa `supabaseAdmin` ni `SUPABASE_SERVICE_ROLE_KEY`.
 *  - `entity_kind` del enum oficial NO incluye `review`, por lo cual NO se
 *    inserta en `content_audit_log`. La bitácora de moderación se preserva
 *    de forma append-only dentro de `reviews.metadata.moderation_history`
 *    (estructura JSON ya soportada por el esquema vigente).
 *  - Las transiciones respetan la máquina oficial Serie 14:
 *    draft → in_review → approved → published → archived.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["archived", "draft"],
  archived: ["draft"],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

export interface ReviewDetail {
  id: string;
  subject_kind: string | null;
  subject_id: string | null;
  author_user_id: string | null;
  author_display_name: string | null;
  rating: number | null;
  title: string | null;
  body: string | null;
  language: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationHistoryEntry {
  action: "transition";
  from_status: ContentStatus;
  to_status: ContentStatus;
  notes: string | null;
  actor_user_id: string;
  at: string;
}

/* ────────────────  Detalle de reseña para moderación  ──────────────── */

export const getReviewForModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }): Promise<ReviewDetail> => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: row, error } = await db
      .from("reviews")
      .select(
        "id, subject_kind, subject_id, author_user_id, author_display_name, rating, title, body, language, status, published_at, created_at, updated_at",
      )
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return JSON.parse(JSON.stringify(row)) as ReviewDetail;
  });

/* ──────────────────────  Transición de moderación  ─────────────────── */

interface ModerateInput {
  id: string;
  to: ContentStatus;
  notes?: string;
}

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ModerateInput) => {
    if (!d?.id || !d?.to) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;

    const { data: current, error: readErr } = await db
      .from("reviews")
      .select("id, status, metadata")
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

    const notes = (data.notes ?? "").trim().slice(0, 1000);

    const prevMeta =
      current.metadata && typeof current.metadata === "object"
        ? (current.metadata as Record<string, unknown>)
        : {};
    const prevHistory = Array.isArray(prevMeta.moderation_history)
      ? (prevMeta.moderation_history as ModerationHistoryEntry[])
      : [];
    const entry: ModerationHistoryEntry = {
      action: "transition",
      from_status: from,
      to_status: data.to,
      notes: notes.length > 0 ? notes : null,
      actor_user_id: context.userId,
      at: new Date().toISOString(),
    };
    const nextMeta = {
      ...prevMeta,
      moderation_history: [...prevHistory, entry].slice(-200),
    };

    const patch: Record<string, unknown> = {
      status: data.to,
      updated_by: context.userId,
      metadata: nextMeta,
    };
    if (data.to === "published") {
      patch.published_at = new Date().toISOString();
    }

    const { error: updErr } = await db
      .from("reviews")
      .update(patch)
      .eq("id", data.id);
    if (updErr) throw updErr;

    return { id: data.id, from, to: data.to };
  });

/* ──────────────────  Historial de moderación (lectura)  ────────────── */

export const listReviewModerationHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("invalid_input");
    return d;
  })
  .handler(async ({ data, context }): Promise<ModerationHistoryEntry[]> => {
    await assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: row, error } = await db
      .from("reviews")
      .select("metadata")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    const meta =
      row?.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    const hist = Array.isArray(meta.moderation_history)
      ? (meta.moderation_history as ModerationHistoryEntry[])
      : [];
    return [...hist].reverse();
  });
