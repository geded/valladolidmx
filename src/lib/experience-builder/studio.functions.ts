/**
 * Experience Builder · Studio Server Functions (Etapa 15.10.2)
 *
 * Endpoints autenticados que respaldan al Studio v0. Toda la
 * autorización dura reside en las RPCs `SECURITY DEFINER`:
 *  - eb_create_composition
 *  - eb_save_composition_draft
 *  - eb_create_revision
 *  - eb_restore_revision
 *
 * Estas server functions NO modifican el sitio público y respetan el
 * principio Page-Type Agnostic: `page_type` es solo un metadato.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CompositionNode, CompositionTree } from "./composition-tree";
import { EMPTY_TREE } from "./composition-tree";
import { translateTreeBestEffort } from "./translate.functions";

export interface CompositionSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  page_type: string;
  active_revision_id: string | null;
  updated_at: string;
}

export interface CompositionDetail extends CompositionSummary {
  current_draft: CompositionTree;
  /**
   * SHA-256 hex del snapshot de la revisión activa (si existe). Permite
   * al Studio comparar contra el hash del árbol en edición para mostrar
   * el badge "Cambios sin publicar" sin descargar el snapshot completo.
   * `null` cuando la página nunca se publicó.
   */
  published_hash: string | null;
  published_at: string | null;
  /**
   * US-D · Fecha ISO en que la página se publicará automáticamente. `null`
   * si no hay publicación programada.
   */
  scheduled_publish_at: string | null;
  /**
   * US-02 · Estado del flujo editorial independiente del ciclo de
   * publicación. Valores: `draft`, `in_review`, `approved`.
   */
  workflow_state: "draft" | "in_review" | "approved";
  workflow_updated_at: string | null;
  workflow_notes: string | null;
}

export interface CompositionRevisionSummary {
  id: string;
  composition_id: string;
  revision_number: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  author_name: string | null;
  section_count: number;
  is_active: boolean;
}

function mergeExistingNodeI18n(
  incoming: CompositionNode,
  existingById: Map<string, CompositionNode>,
): CompositionNode {
  const existing = existingById.get(incoming.id);
  return {
    ...incoming,
    i18n: incoming.i18n ?? existing?.i18n,
    children: incoming.children?.map((child) => mergeExistingNodeI18n(child, existingById)),
  };
}

function mergeExistingI18n(incoming: CompositionTree, existing?: CompositionTree | null): CompositionTree {
  if (!existing?.root?.children?.length) return incoming;
  const existingById = new Map<string, CompositionNode>();
  const visit = (nodes: CompositionNode[]) => {
    for (const node of nodes) {
      existingById.set(node.id, node);
      if (node.children?.length) visit(node.children);
    }
  };
  visit(existing.root.children);
  return {
    ...incoming,
    root: {
      ...incoming.root,
      children: (incoming.root.children ?? []).map((node) => mergeExistingNodeI18n(node, existingById)),
    },
  };
}

export const listCompositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompositionSummary[]> => {
    const { data, error } = await context.supabase
      .from("page_compositions")
      .select(
        "id, slug, title, description, status, page_type, active_revision_id, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as CompositionSummary[];
  });

export const getComposition = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<CompositionDetail | null> => {
    const { data: row, error } = await context.supabase
      .from("page_compositions")
      .select(
        "id, slug, title, description, status, page_type, active_revision_id, updated_at, current_draft, published_at, scheduled_publish_at, workflow_state, workflow_updated_at, workflow_notes",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const activeId = (row as { active_revision_id: string | null }).active_revision_id;
    let published_hash: string | null = null;
    if (activeId) {
      const { data: rev } = await context.supabase
        .from("page_revisions")
        .select("snapshot")
        .eq("id", activeId)
        .maybeSingle();
      if (rev?.snapshot) {
        published_hash = await sha256Hex(canonicalize(rev.snapshot));
      }
    }
    return {
      ...(row as unknown as Omit<CompositionDetail, "current_draft" | "published_hash" | "published_at">),
      current_draft: ((row as { current_draft: unknown }).current_draft as CompositionTree) ?? EMPTY_TREE,
      published_hash,
      published_at: (row as { published_at: string | null }).published_at ?? null,
      scheduled_publish_at:
        (row as { scheduled_publish_at: string | null }).scheduled_publish_at ?? null,
    };
  });

/**
 * Devuelve el árbol de la revisión activa (snapshot publicado) de una
 * composición, o `null` si nunca se publicó. Se usa en el Studio para
 * generar un diff resumen entre el borrador en edición y lo público
 * antes de confirmar "Publicar cambios" (US-C).
 */
export const getPublishedTree = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<CompositionTree | null> => {
    const { data: row, error } = await context.supabase
      .from("page_compositions")
      .select("active_revision_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const activeId = (row as { active_revision_id: string | null } | null)?.active_revision_id ?? null;
    if (!activeId) return null;
    const { data: rev, error: revErr } = await context.supabase
      .from("page_revisions")
      .select("snapshot")
      .eq("id", activeId)
      .maybeSingle();
    if (revErr) throw new Error(revErr.message);
    if (!rev?.snapshot) return null;
    return rev.snapshot as unknown as CompositionTree;
  });

/**
 * Serialización determinista (keys ordenadas) para que el hash del árbol
 * sea estable frente a diferencias de orden de propiedades introducidas
 * por el editor o el pipeline de traducción.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createComposition = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { slug: string; title: string; description?: string; page_type?: string }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("eb_create_composition", {
      _slug: data.slug,
      _title: data.title,
      _description: data.description,
      _page_type: data.page_type ?? "generic",
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const saveCompositionDraft = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; tree: CompositionTree }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: existingRow } = await context.supabase
      .from("page_compositions")
      .select("current_draft")
      .eq("id", data.id)
      .maybeSingle();
    let treeToSave = mergeExistingI18n(
      data.tree,
      (existingRow?.current_draft as CompositionTree | undefined) ?? null,
    );

    try {
      const translated = await translateTreeBestEffort(treeToSave, context.supabase);
      treeToSave = translated.tree;
    } catch {
      // La traducción automática nunca debe romper ni bloquear el guardado.
    }

    const { error } = await context.supabase.rpc("eb_save_composition_draft", {
      _id: data.id,
      _tree: treeToSave as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCompositionRevision = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ revision_id: string }> => {
    const { data: rev_id, error } = await context.supabase.rpc("eb_create_revision", {
      _id: data.id,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { revision_id: rev_id as unknown as string };
  });

export const listCompositionRevisions = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<CompositionRevisionSummary[]> => {
    const { data: rows, error } = await context.supabase
      .from("page_revisions")
      .select("id, composition_id, revision_number, notes, created_at, created_by, snapshot")
      .eq("composition_id", data.id)
      .order("revision_number", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    // Autor: batch lookup en profiles (best-effort; RLS puede filtrar).
    const authorIds = Array.from(
      new Set(list.map((r) => (r as { created_by: string | null }).created_by).filter((x): x is string => !!x)),
    );
    const nameById = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", authorIds);
      for (const p of (profs ?? []) as Array<{ user_id: string; display_name: string | null; email: string | null }>) {
        nameById.set(p.user_id, p.display_name || p.email || "");
      }
    }

    // Revisión activa
    const { data: comp } = await context.supabase
      .from("page_compositions")
      .select("active_revision_id")
      .eq("id", data.id)
      .maybeSingle();
    const activeId = (comp as { active_revision_id: string | null } | null)?.active_revision_id ?? null;

    return list.map((r) => {
      const snap = (r as { snapshot: unknown }).snapshot as
        | { root?: { children?: unknown[] } }
        | null;
      const sectionCount = Array.isArray(snap?.root?.children) ? snap!.root!.children!.length : 0;
      return {
        id: r.id,
        composition_id: r.composition_id,
        revision_number: r.revision_number,
        notes: r.notes,
        created_at: r.created_at,
        created_by: (r as { created_by: string | null }).created_by,
        author_name: (r as { created_by: string | null }).created_by
          ? nameById.get((r as { created_by: string }).created_by) ?? null
          : null,
        section_count: sectionCount,
        is_active: activeId === r.id,
      } as CompositionRevisionSummary;
    });
  });

export const restoreCompositionRevision = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; revision_id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_restore_revision", {
      _id: data.id,
      _revision_id: data.revision_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Etapa 15.10.3 · Publicación pública
 *
 * Las RPCs validan internamente que el actor tenga el rol `admin`
 * (los editores solo pueden crear borradores y revisiones).
 * ------------------------------------------------------------------ */

export const publishComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ revision_id: string }> => {
    const { data: rev_id, error } = await context.supabase.rpc(
      "eb_publish_composition",
      { _id: data.id, _notes: data.notes },
    );
    if (error) throw new Error(error.message);
    return { revision_id: rev_id as unknown as string };
  });

export const unpublishComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_unpublish_composition", {
      _id: data.id,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * US-D · Programa una publicación futura. La ejecuta el sistema (cron)
 * cuando llega la fecha; el estado queda en 'draft' hasta ese momento.
 */
export const schedulePublishComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; scheduled_at: string; notes?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_schedule_publish_composition", {
      _id: data.id,
      _when: data.scheduled_at,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelScheduledPublish = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_cancel_scheduled_publish", {
      _id: data.id,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Soft edit lock (US-01) --------------------------------------------- */

export interface EditingLock {
  user_id: string;
  user_name: string;
  acquired_at: string;
  heartbeat_at: string;
}

export interface AcquireLockResult {
  acquired: boolean;
  lock: EditingLock | null;
}

export const acquireEditLock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; force?: boolean }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<AcquireLockResult> => {
    const { data: res, error } = await context.supabase.rpc("eb_acquire_edit_lock", {
      _composition_id: data.id,
      _force: data.force ?? false,
    });
    if (error) throw new Error(error.message);
    const payload = (res ?? {}) as { acquired?: boolean; lock?: EditingLock | null };
    return { acquired: Boolean(payload.acquired), lock: payload.lock ?? null };
  });

export const heartbeatEditLock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: boolean; lock: EditingLock | null }> => {
    const { data: res, error } = await context.supabase.rpc("eb_heartbeat_edit_lock", {
      _composition_id: data.id,
    });
    if (error) throw new Error(error.message);
    const payload = (res ?? {}) as { ok?: boolean; lock?: EditingLock | null };
    return { ok: Boolean(payload.ok), lock: payload.lock ?? null };
  });

export const releaseEditLock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ released: boolean }> => {
    const { data: res, error } = await context.supabase.rpc("eb_release_edit_lock", {
      _composition_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { released: Boolean((res as { released?: boolean } | null)?.released) };
  });

/* Shareable draft previews (US-16) ------------------------------------- */

export interface CompositionPreviewLink {
  token: string;
  expires_at: string;
}

/**
 * Emite un token temporal para compartir el borrador actual de una
 * composición como vista previa pública (sin publicar). El token queda
 * asociado a la composición; al resolverlo se lee el `current_draft`
 * más reciente, así el enlace se mantiene "vivo" mientras el editor
 * sigue trabajando.
 */
export const issueCompositionPreviewLink = createServerFn({ method: "POST" })
  .inputValidator((data: { composition_id: string; ttl_minutes?: number }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<CompositionPreviewLink> => {
    const ttl = Math.max(5, Math.min(60 * 24 * 7, data.ttl_minutes ?? 60 * 24)); // 5min..7d, default 24h
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const expires_at = new Date(Date.now() + ttl * 60_000).toISOString();
    const { error } = await context.supabase.from("composition_preview_tokens").insert({
      token,
      composition_id: data.composition_id,
      created_by: context.userId,
      expires_at,
    });
    if (error) throw new Error(error.message);
    return { token, expires_at };
  });

export interface CompositionPreviewPayload {
  tree: CompositionTree;
  title: string;
  page_type: string;
  slug: string;
  expires_at: string;
}

/**
 * Resuelve un token público. No requiere autenticación: usa el cliente
 * admin para bypass RLS pero valida el token y la caducidad antes de
 * devolver el árbol.
 */
export const resolveCompositionPreview = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<CompositionPreviewPayload | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tok, error: tokErr } = await supabaseAdmin
      .from("composition_preview_tokens")
      .select("composition_id, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (tokErr) throw new Error(tokErr.message);
    if (!tok) return null;
    if (new Date(tok.expires_at).getTime() < Date.now()) return null;

    const { data: comp, error: compErr } = await supabaseAdmin
      .from("page_compositions")
      .select("current_draft, title, page_type, slug")
      .eq("id", tok.composition_id)
      .maybeSingle();
    if (compErr) throw new Error(compErr.message);
    if (!comp) return null;

    return {
      tree: (comp.current_draft as unknown as CompositionTree) ?? EMPTY_TREE,
      title: comp.title,
      page_type: comp.page_type,
      slug: comp.slug,
      expires_at: tok.expires_at,
    };
  });
/**
 * US-02 · Cambia el estado del flujo editorial.
 * - draft → in_review: cualquier editor autenticado.
 * - in_review → approved: sólo admin / super_admin (validado en RPC).
 * - approved → draft: cualquier editor (para reabrir el ciclo).
 */
export const setCompositionWorkflowState = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; next_state: "draft" | "in_review" | "approved"; notes?: string | null }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("eb_set_workflow_state", {
      _composition_id: data.id,
      _next_state: data.next_state,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return result as { workflow_state: string; changed: boolean };
  });

/* US-03 · Comentarios inline por bloque ---------------------------------- */

export interface BlockComment {
  id: string;
  composition_id: string;
  block_id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const listBlockComments = createServerFn({ method: "GET" })
  .inputValidator((data: { composition_id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<BlockComment[]> => {
    const { data: rows, error } = await context.supabase
      .from("eb_block_comments")
      .select("id, composition_id, block_id, author_id, body, resolved_at, resolved_by, created_at, updated_at")
      .eq("composition_id", data.composition_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Omit<BlockComment, "author_name">[];
    // Resolver nombres de autores en un solo lote (best-effort).
    const ids = Array.from(new Set(list.map((r) => r.author_id)));
    let nameMap = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      nameMap = new Map((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));
    }
    return list.map((r) => ({ ...r, author_name: nameMap.get(r.author_id) ?? null }));
  });

export const createBlockComment = createServerFn({ method: "POST" })
  .inputValidator((data: { composition_id: string; block_id: string; body: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const body = data.body.trim();
    if (!body) throw new Error("El comentario está vacío");
    if (body.length > 4000) throw new Error("Comentario demasiado largo");
    const { data: id, error } = await context.supabase.rpc("eb_comment_create", {
      _composition_id: data.composition_id,
      _block_id: data.block_id,
      _body: body,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const resolveBlockComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("eb_comment_resolve", { _comment_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reopenBlockComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("eb_comment_reopen", { _comment_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteBlockComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("eb_block_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
