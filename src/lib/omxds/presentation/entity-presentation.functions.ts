/**
 * G8-R1-F1C-A · Server functions de la autoridad de presentación.
 *
 * Wrappers delgados: la autoridad vive en las RPC gobernadas
 * `set_entity_presentation_mode`, `review_entity_presentation_mode` y
 * `get_entity_presentation_mode` (SECURITY DEFINER, fail-closed por portada).
 *
 * Prohibido: publicar, cambiar familia, cambiar estado de contenido, tocar
 * campos comerciales o activar el flag global.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["business", "product", "event", "place"]);

type Rpc = {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          value: string,
        ) => {
          eq: (
            col: string,
            value: string,
          ) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => {
              limit: (
                n: number,
              ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
  };
};

export interface PresentationHistoryEntry {
  id: string;
  action: string;
  from_mode: string | null;
  to_mode: string | null;
  from_state: string | null;
  to_state: string | null;
  cover_media_asset_id: string | null;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface PresentationModeState {
  effective_mode: "editorial" | "cinematic";
  requested_mode: "editorial" | "cinematic";
  approved_mode: "editorial" | "cinematic";
  review_state: "not_requested" | "pending" | "approved" | "rejected";
  cover_media_asset_id: string | null;
  cover_eligible: boolean;
  fallback_reason: string | null;
  source: string;
}

function validate(input: { entityKind: string; entityId: string }) {
  if (!input || !KINDS.has(input.entityKind)) throw new Error("invalid_entity_kind");
  if (!UUID.test(input.entityId ?? "")) throw new Error("invalid_entity_id");
  return input;
}

/** Empresa solicita / staff fija el modo. Nunca publica. */
export const setEntityPresentationMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      entityKind: string;
      entityId: string;
      mode: "editorial" | "cinematic";
      reason?: string;
    }) => {
      validate(input);
      if (input.mode !== "editorial" && input.mode !== "cinematic")
        throw new Error("invalid_presentation_mode");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Rpc;
    const { error } = await ctx.supabase.rpc("set_entity_presentation_mode", {
      _entity_kind: data.entityKind,
      _entity_id: data.entityId,
      _mode: data.mode,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, published: false as const };
  });

/** Revisión editorial (staff): aprobar o devolver a Editorial. */
export const reviewEntityPresentationMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      entityKind: string;
      entityId: string;
      decision: "approve" | "reject";
      reason?: string;
    }) => {
      validate(input);
      if (input.decision !== "approve" && input.decision !== "reject")
        throw new Error("invalid_decision");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Rpc;
    const { error } = await ctx.supabase.rpc("review_entity_presentation_mode", {
      _entity_kind: data.entityKind,
      _entity_id: data.entityId,
      _decision: data.decision,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, published: false as const };
  });

/** Modo vigente con verificación de portada en tiempo real. */
export const getEntityPresentationMode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { entityKind: string; entityId: string }) => validate(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Rpc;
    const { data: rows, error } = await ctx.supabase.rpc("get_entity_presentation_mode", {
      _entity_kind: data.entityKind,
      _entity_id: data.entityId,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? (rows[0] as PresentationModeState | undefined) : undefined;
    return (
      row ?? {
        effective_mode: "editorial",
        requested_mode: "editorial",
        approved_mode: "editorial",
        review_state: "not_requested",
        cover_media_asset_id: null,
        cover_eligible: false,
        fallback_reason: null,
        source: "default",
      }
    );
  });

/** Historial completo de transiciones (equipo de la empresa o staff). */
export const listEntityPresentationHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { entityKind: string; entityId: string }) => validate(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Rpc;
    const { data: rows, error } = await ctx.supabase
      .from("entity_presentation_mode_history")
      .select(
        "id, action, from_mode, to_mode, from_state, to_state, cover_media_asset_id, reason, actor_user_id, created_at",
      )
      .eq("entity_kind", data.entityKind)
      .eq("entity_id", data.entityId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as PresentationHistoryEntry[];
  });
