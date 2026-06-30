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
import type { CompositionTree } from "./composition-tree";
import { EMPTY_TREE } from "./composition-tree";

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
    const { error } = await context.supabase.rpc("eb_save_composition_draft", {
      _id: data.id,
      _tree: data.tree as never,
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
      .select("id, composition_id, revision_number, notes, created_at")
      .eq("composition_id", data.id)
      .order("revision_number", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as CompositionRevisionSummary[];
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