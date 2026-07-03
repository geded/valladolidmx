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
        "id, slug, title, description, status, page_type, active_revision_id, updated_at, current_draft",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      ...(row as Omit<CompositionDetail, "current_draft">),
      current_draft: ((row as { current_draft: unknown }).current_draft as CompositionTree) ?? EMPTY_TREE,
    };
  });

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