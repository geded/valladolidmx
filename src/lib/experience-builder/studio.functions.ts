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
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { CompositionNode, CompositionTree } from "./composition-tree";
import { EMPTY_TREE } from "./composition-tree";
import { translateTreeBestEffort } from "./translate.functions";
import {
  getMarketplaceBusinessBySlug,
  type MarketplaceBusinessDetail,
} from "@/lib/catalog/marketplace-reads.functions";
import { buildGovernedLocationItems } from "./blocks/experience-info-grid/contract";
import {
  INFO_GRID_TYPE,
  isLegacyInfoGridConfig,
  collectEditorialMediaPaths,
  resolveEditorialActor,
  resolveEditorialSurface,
  validateEditorialCompositionTree,
  type EditorialActorClass,
  type EditorialSurface,
} from "./editorial-builder-policy";

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
  workflow_state: "draft" | "in_review" | "approved" | "scheduled" | "published";
  workflow_updated_at: string | null;
  workflow_notes: string | null;
  draft_author_id: string | null;
  approved_revision_id: string | null;
  approved_snapshot_hash: string | null;
  approved_by: string | null;
  approved_at: string | null;
  scheduled_revision_id: string | null;
  scheduled_snapshot_hash: string | null;
  draft_version: number;
  draft_hash: string | null;
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

function mergeExistingI18n(
  incoming: CompositionTree,
  existing?: CompositionTree | null,
): CompositionTree {
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
      children: (incoming.root.children ?? []).map((node) =>
        mergeExistingNodeI18n(node, existingById),
      ),
    },
  };
}

// I4-A keeps the database and RPC surface unchanged: it resolves existing RBAC
// and Media Registry records before any authoring RPC is allowed to run.
type EditorialServerContext = { supabase: SupabaseClient<Database>; userId: string };

async function resolveServerEditorialActor(
  context: EditorialServerContext,
): Promise<EditorialActorClass> {
  const roles = ["super_admin", "admin", "editor", "business_owner"] as const;
  const resolved: string[] = [];
  for (const role of roles) {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: role,
    });
    if (error) throw new Error(`i4_role_check_failed: ${error.message}`);
    if (data) resolved.push(role);
  }
  const actor = resolveEditorialActor(resolved);
  if (!actor) throw new Error("i4_authoring_forbidden: actor is outside the allowlist");
  return actor;
}

async function loadRegisteredMediaPaths(
  context: Pick<EditorialServerContext, "supabase">,
  tree: CompositionTree,
) {
  const paths = collectEditorialMediaPaths(tree);
  if (!paths.length) return new Set<string>();
  const { data, error } = await context.supabase
    .from("media_assets")
    .select("storage_path")
    .in("storage_path", paths)
    .is("deleted_at", null);
  if (error) throw new Error(`i4_media_registry_failed: ${error.message}`);
  return new Set<string>((data ?? []).map((row: { storage_path: string }) => row.storage_path));
}

/* ------------------------------------------------------------------ *
 * I4-A/B/C · Governed Source Reconciliation (18.51)
 *
 * El binding gobernado `geography.location` se resuelve SIEMPRE en el
 * servidor a partir de `page_type` y `slug` persistidos. El cliente no
 * puede aportar identidad ni valores gobernados, y sin fuente válida
 * el flujo falla en cerrado, nunca con datos ficticios.
 * ------------------------------------------------------------------ */

function walkNodes(nodes: readonly CompositionNode[] | undefined): CompositionNode[] {
  const output: CompositionNode[] = [];
  for (const node of nodes ?? []) {
    output.push(node);
    output.push(...walkNodes((node as { children?: CompositionNode[] }).children));
  }
  return output;
}

/** `true` si el árbol contiene autoría gobernada nueva de info-grid. */
export function treeRequiresGovernedLocation(tree: CompositionTree | null | undefined): boolean {
  return walkNodes(tree?.root?.children).some(
    (node) =>
      node.type === INFO_GRID_TYPE &&
      !isLegacyInfoGridConfig((node.config ?? {}) as Record<string, unknown>),
  );
}

export interface GovernedLocationResolution {
  ok: boolean;
  reason: string | null;
  business: MarketplaceBusinessDetail | null;
}

/**
 * Resuelve `geography.location` desde la fuente publicada oficial.
 * Reutiliza `getMarketplaceBusinessBySlug`; no crea readers nuevos.
 */
export async function resolveGovernedLocationSource(input: {
  pageType: string;
  slug: string;
}): Promise<GovernedLocationResolution> {
  const surface = resolveEditorialSurface(input.pageType);
  if (surface !== "business")
    return {
      ok: false,
      reason: `governed_source_unavailable: page_type "${input.pageType}" has no governed geography.location surface`,
      business: null,
    };
  let business: MarketplaceBusinessDetail | null = null;
  try {
    business = await getMarketplaceBusinessBySlug({ data: { slug: input.slug } });
  } catch {
    business = null;
  }
  if (!business || business.provenance !== "published")
    return {
      ok: false,
      reason: `governed_source_unavailable: no published business resolves slug "${input.slug}"`,
      business: null,
    };
  if (!buildGovernedLocationItems(business))
    return {
      ok: false,
      reason: `governed_source_unavailable: published business "${input.slug}" has no governed location`,
      business: null,
    };
  return { ok: true, reason: null, business };
}

async function assertI4AuthoringTree(input: {
  context: EditorialServerContext;
  tree: CompositionTree;
  previousTree?: CompositionTree | null;
  pageType: string;
  operation?: "edit" | "duplicate" | "template_new";
}) {
  const surface: EditorialSurface | null = resolveEditorialSurface(input.pageType);
  if (!surface) throw new Error(`i4_authoring_forbidden: unknown page kind "${input.pageType}"`);
  const actor = await resolveServerEditorialActor(input.context);
  if (actor === "business_author" && surface !== "business")
    throw new Error("i4_authoring_forbidden: business authors require business surface");
  const registeredMediaPaths = await loadRegisteredMediaPaths(input.context, input.tree);
  const validation = validateEditorialCompositionTree({
    tree: input.tree,
    previous_tree: input.previousTree,
    surface,
    actor,
    operation: input.operation,
    registered_media_paths: registeredMediaPaths,
  });
  if (!validation.valid) throw new Error(`i4_authoring_rejected: ${validation.errors.join("; ")}`);
}

export const listCompositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompositionSummary[]> => {
    const { data, error } = await context.supabase
      .from("page_compositions")
      .select("id, slug, title, description, status, page_type, active_revision_id, updated_at")
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
        "id, slug, title, description, status, page_type, active_revision_id, updated_at, current_draft, published_at, scheduled_publish_at, workflow_state, workflow_updated_at, workflow_notes, draft_author_id, approved_revision_id, approved_snapshot_hash, approved_by, approved_at, scheduled_revision_id, scheduled_snapshot_hash, draft_version, draft_hash",
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
      ...(row as unknown as Omit<
        CompositionDetail,
        "current_draft" | "published_hash" | "published_at"
      >),
      current_draft:
        ((row as { current_draft: unknown }).current_draft as CompositionTree) ?? EMPTY_TREE,
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
    const activeId =
      (row as { active_revision_id: string | null } | null)?.active_revision_id ?? null;
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
  .inputValidator((data: { id: string; tree: CompositionTree; expected_hash?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ data, context }): Promise<{ ok: true; draft_hash: string; draft_version: number }> => {
      const { data: existingRow } = await context.supabase
        .from("page_compositions")
        .select("current_draft, page_type, slug, draft_hash")
        .eq("id", data.id)
        .maybeSingle();
      if (!existingRow) throw new Error("i4_authoring_rejected: composition not found");
      const previousTree =
        (existingRow.current_draft as unknown as CompositionTree | undefined) ?? EMPTY_TREE;
      const serverDraftHash =
        (existingRow as { draft_hash: string | null }).draft_hash ??
        (await sha256Hex(canonicalize(previousTree)));
      if (!data.expected_hash || data.expected_hash !== serverDraftHash) {
        throw new Error(
          "draft_conflict: El borrador cambió desde que lo abriste. Recarga antes de guardar.",
        );
      }
      let treeToSave = mergeExistingI18n(data.tree, previousTree);

      await assertI4AuthoringTree({
        context,
        tree: treeToSave,
        previousTree,
        pageType: String(existingRow.page_type),
      });

      try {
        const translated = await translateTreeBestEffort(treeToSave, context.supabase);
        treeToSave = translated.tree;
      } catch {
        // La traducción automática nunca debe romper ni bloquear el guardado.
      }

      await assertI4AuthoringTree({
        context,
        tree: treeToSave,
        previousTree,
        pageType: String(existingRow.page_type),
      });

      const { data: result, error } = await context.supabase.rpc("eb_save_composition_draft", {
        _id: data.id,
        _tree: treeToSave as never,
        _expected_hash: data.expected_hash,
      });
      if (error) throw new Error(error.message);
      const payload = (result ?? {}) as { draft_hash?: string; draft_version?: number };
      return {
        ok: true,
        draft_hash: String(payload.draft_hash),
        draft_version: Number(payload.draft_version),
      };
    },
  );

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
      new Set(
        list
          .map((r) => (r as { created_by: string | null }).created_by)
          .filter((x): x is string => !!x),
      ),
    );
    const nameById = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", authorIds);
      for (const p of (profs ?? []) as Array<{
        user_id: string;
        display_name: string | null;
        email: string | null;
      }>) {
        nameById.set(p.user_id, p.display_name || p.email || "");
      }
    }

    // Revisión activa
    const { data: comp } = await context.supabase
      .from("page_compositions")
      .select("active_revision_id")
      .eq("id", data.id)
      .maybeSingle();
    const activeId =
      (comp as { active_revision_id: string | null } | null)?.active_revision_id ?? null;

    return list.map((r) => {
      const snap = (r as { snapshot: unknown }).snapshot as {
        root?: { children?: unknown[] };
      } | null;
      const sectionCount = Array.isArray(snap?.root?.children) ? snap!.root!.children!.length : 0;
      return {
        id: r.id,
        composition_id: r.composition_id,
        revision_number: r.revision_number,
        notes: r.notes,
        created_at: r.created_at,
        created_by: (r as { created_by: string | null }).created_by,
        author_name: (r as { created_by: string | null }).created_by
          ? (nameById.get((r as { created_by: string }).created_by) ?? null)
          : null,
        section_count: sectionCount,
        is_active: activeId === r.id,
      } as CompositionRevisionSummary;
    });
  });

export const restoreCompositionRevision = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; revision_id: string; expected_hash: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ data, context }): Promise<{ ok: true; draft_hash: string; draft_version: number }> => {
      const { data: rev, error: revErr } = await context.supabase
        .from("page_revisions")
        .select("snapshot")
        .eq("id", data.revision_id)
        .eq("composition_id", data.id)
        .maybeSingle();
      if (revErr) throw new Error(revErr.message);
      if (!rev?.snapshot) throw new Error("revision not found for composition");
      const { data: existingRow } = await context.supabase
        .from("page_compositions")
        .select("current_draft, page_type, slug, draft_hash")
        .eq("id", data.id)
        .maybeSingle();
      if (!existingRow) throw new Error("i4_authoring_rejected: composition not found");
      const previousTree =
        (existingRow.current_draft as unknown as CompositionTree | undefined) ?? EMPTY_TREE;
      const serverDraftHash =
        (existingRow as { draft_hash: string | null }).draft_hash ??
        (await sha256Hex(canonicalize(previousTree)));
      if (!data.expected_hash || data.expected_hash !== serverDraftHash) {
        throw new Error(
          "draft_conflict: El borrador cambió desde que lo abriste. Recarga antes de restaurar.",
        );
      }
      const snapshotTree = rev.snapshot as unknown as CompositionTree;
      await assertI4AuthoringTree({
        context,
        tree: snapshotTree,
        previousTree,
        pageType: String(existingRow.page_type),
      });
      // 18.51 · El rollback revalida `geography.location` ANTES de la RPC.
      // Si la fuente gobernada no resuelve, se rechaza sin tocar la base.
      if (treeRequiresGovernedLocation(snapshotTree)) {
        const governed = await resolveGovernedLocationSource({
          pageType: String(existingRow.page_type),
          slug: String((existingRow as { slug: string }).slug),
        });
        if (!governed.ok)
          throw new Error(
            `i4_rollback_rejected: ${governed.reason ?? "governed_source_unavailable"}`,
          );
      }
      const { data: result, error } = await context.supabase.rpc("eb_restore_revision", {
        _id: data.id,
        _revision_id: data.revision_id,
        _expected_hash: data.expected_hash,
      });
      if (error) throw new Error(error.message);
      const payload = (result ?? {}) as { draft_hash?: string; draft_version?: number };
      return {
        ok: true,
        draft_hash: String(payload.draft_hash),
        draft_version: Number(payload.draft_version),
      };
    },
  );

/* ------------------------------------------------------------------ *
 * Etapa 15.10.3 · Publicación pública
 *
 * Las RPCs I4-B son la única autoridad de escritura: validan RBAC, identidad
 * autor/aprobador y el revision/hash exacto antes de publicar o programar.
 * ------------------------------------------------------------------ */

export const publishComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ revision_id: string }> => {
    const { data: rev_id, error } = await context.supabase.rpc("eb_publish_composition", {
      _id: data.id,
      _notes: data.notes,
    });
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
 * cuando llega la fecha; la RPC congela la revisión/hash aprobada y el
 * procesador service-role rechaza cualquier programación legacy o incoherente.
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
  snapshot_hash: string;
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
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const token = Array.from(raw, (b) => b.toString(16).padStart(2, "0")).join("");
    const token_digest = await sha256Hex(token);
    const { data: result, error } = await context.supabase.rpc("eb_issue_composition_preview", {
      _composition_id: data.composition_id,
      _token_digest: token_digest,
      _ttl_minutes: ttl,
    });
    if (error) throw new Error(error.message);
    const payload = (result ?? {}) as { expires_at?: string; snapshot_hash?: string };
    return {
      token,
      expires_at: String(payload.expires_at),
      snapshot_hash: String(payload.snapshot_hash),
    };
  });

export const revokeCompositionPreviewLink = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; reason?: string | null }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const token_digest = await sha256Hex(data.token);
    const { error } = await context.supabase.rpc("eb_revoke_composition_preview", {
      _token_digest: token_digest,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface CompositionPreviewPayload {
  tree: CompositionTree;
  title: string;
  page_type: string;
  slug: string;
  expires_at: string;
  snapshot_hash: string;
  /**
   * 18.51 · Fuente gobernada resuelta server-side a partir de
   * `page_type` y `slug` persistidos. `null` cuando no resuelve: la
   * vista previa debe fallar en cerrado, jamás inventar datos.
   */
  governed_source: {
    kind: "business";
    slug: string;
    provenance: "published";
    business: MarketplaceBusinessDetail;
  } | null;
  /** Motivo explícito cuando el binding gobernado no resuelve. */
  governed_source_error: string | null;
  /** `true` si el árbol contiene autoría gobernada que exige fuente. */
  requires_governed_source: boolean;
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
    const { data: resolvedPreview, error: tokErr } = await supabaseAdmin.rpc(
      "eb_resolve_composition_preview",
      { _token: data.token },
    );
    if (tokErr) throw new Error(tokErr.message);
    const tok = resolvedPreview as {
      composition_id: string;
      expires_at: string;
      snapshot_hash: string;
      snapshot: unknown;
    } | null;
    if (!tok) return null;

    const { data: comp, error: compErr } = await supabaseAdmin
      .from("page_compositions")
      .select("title, page_type, slug")
      .eq("id", tok.composition_id)
      .maybeSingle();
    if (compErr) throw new Error(compErr.message);
    if (!comp) return null;

    const previewTree = (tok.snapshot as unknown as CompositionTree) ?? EMPTY_TREE;
    const requiresGoverned = treeRequiresGovernedLocation(previewTree);
    let governed: CompositionPreviewPayload["governed_source"] = null;
    let governedError: string | null = null;
    if (requiresGoverned) {
      const resolution = await resolveGovernedLocationSource({
        pageType: String(comp.page_type),
        slug: String(comp.slug),
      });
      if (resolution.ok && resolution.business)
        governed = {
          kind: "business",
          slug: String(comp.slug),
          provenance: "published",
          business: resolution.business,
        };
      else governedError = resolution.reason ?? "governed_source_unavailable";
    }

    return {
      tree: previewTree,
      title: comp.title,
      page_type: comp.page_type,
      slug: comp.slug,
      expires_at: tok.expires_at,
      snapshot_hash: tok.snapshot_hash,
      governed_source: governed,
      governed_source_error: governedError,
      requires_governed_source: requiresGoverned,
    };
  });
/**
 * US-02 · Cambia el estado del flujo editorial.
 * - draft → in_review: cualquier editor autenticado.
 * - in_review → approved: sólo admin / super_admin (validado en RPC).
 * - approved/scheduled/published → draft: reabre el ciclo e invalida aprobación.
 */
export const setCompositionWorkflowState = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; next_state: "draft" | "in_review" | "approved"; notes?: string | null }) =>
      data,
  )
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
      .select(
        "id, composition_id, block_id, author_id, body, resolved_at, resolved_by, created_at, updated_at",
      )
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
      nameMap = new Map(
        (profs ?? []).map((p: { id: string; display_name: string | null }) => [
          p.id,
          p.display_name,
        ]),
      );
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

/* ==================================================================== *
 * US-R2 · Panel de Páginas — server functions
 *
 * Contrato R2.1–R2.24. Reutiliza RPCs `SECURITY DEFINER` de la
 * migración US-R2. No modifica renderer, publicación, workflow ni
 * ciclo de lock.
 * ==================================================================== */

import type { PageKind } from "./page-kind-registry";

export interface StudioPageRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  page_type: string;
  kind: PageKind;
  is_template: boolean;
  template_of_kind: PageKind | null;
  active_revision_id: string | null;
  workflow_state: "draft" | "in_review" | "approved";
  scheduled_publish_at: string | null;
  published_at: string | null;
  updated_at: string;
  updated_by: string | null;
  author_name: string | null;
  has_unpublished_changes: boolean;
  editing_lock: {
    user_id: string;
    user_name: string;
    acquired_at: string;
    heartbeat_at: string;
  } | null;
}

/**
 * Lista enriquecida usada por el Panel de Páginas (US-R2). Devuelve
 * `kind`, `is_template`, estado de workflow, programación pendiente,
 * autor legible y flag de cambios sin publicar sin exigir un fetch
 * adicional por fila.
 */
export const listStudioPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StudioPageRow[]> => {
    const { data, error } = await context.supabase
      .from("page_compositions")
      .select(
        [
          "id",
          "slug",
          "title",
          "description",
          "status",
          "page_type",
          "kind",
          "is_template",
          "template_of_kind",
          "active_revision_id",
          "workflow_state",
          "scheduled_publish_at",
          "published_at",
          "updated_at",
          "updated_by",
          "editing_lock",
          "current_draft",
        ].join(", "),
      )
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

    // Autor: batch lookup en profiles (best-effort, RLS puede filtrar).
    const authorIds = Array.from(
      new Set(
        rows.map((r) => (r.updated_by as string | null) ?? null).filter((x): x is string => !!x),
      ),
    );
    const nameById = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", authorIds);
      for (const p of (profs ?? []) as Array<{
        user_id: string;
        display_name: string | null;
        email: string | null;
      }>) {
        nameById.set(p.user_id, p.display_name || p.email || "");
      }
    }

    // Hash del snapshot activo para detectar "cambios sin publicar".
    const activeIds = rows
      .map((r) => r.active_revision_id as string | null)
      .filter((x): x is string => !!x);
    const publishedHashById = new Map<string, string>();
    if (activeIds.length > 0) {
      const { data: revs } = await context.supabase
        .from("page_revisions")
        .select("id, snapshot")
        .in("id", activeIds);
      for (const rev of (revs ?? []) as Array<{ id: string; snapshot: unknown }>) {
        if (rev.snapshot) {
          publishedHashById.set(rev.id, await sha256Hex(canonicalize(rev.snapshot)));
        }
      }
    }

    const out: StudioPageRow[] = [];
    for (const r of rows) {
      const activeId = (r.active_revision_id as string | null) ?? null;
      const draftHash = await sha256Hex(canonicalize(r.current_draft));
      const publishedHash = activeId ? (publishedHashById.get(activeId) ?? null) : null;
      const hasChanges = publishedHash ? publishedHash !== draftHash : Boolean(r.current_draft);
      out.push({
        id: String(r.id),
        slug: String(r.slug),
        title: String(r.title),
        description: (r.description as string | null) ?? null,
        status: (r.status as StudioPageRow["status"]) ?? "draft",
        page_type: String(r.page_type ?? "generic"),
        kind: (r.kind as PageKind) ?? ("custom" as PageKind),
        is_template: Boolean(r.is_template),
        template_of_kind: (r.template_of_kind as PageKind | null) ?? null,
        active_revision_id: activeId,
        workflow_state: (r.workflow_state as StudioPageRow["workflow_state"]) ?? "draft",
        scheduled_publish_at: (r.scheduled_publish_at as string | null) ?? null,
        published_at: (r.published_at as string | null) ?? null,
        updated_at: String(r.updated_at),
        updated_by: (r.updated_by as string | null) ?? null,
        author_name:
          (r.updated_by as string | null) && nameById.has(r.updated_by as string)
            ? (nameById.get(r.updated_by as string) ?? null)
            : null,
        has_unpublished_changes: hasChanges,
        editing_lock: (r.editing_lock as StudioPageRow["editing_lock"]) ?? null,
      });
    }
    return out;
  });

export const duplicateComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; new_slug: string; new_title?: string | null }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: source, error: sourceError } = await context.supabase
      .from("page_compositions")
      .select("current_draft, page_type")
      .eq("id", data.id)
      .maybeSingle();
    if (sourceError) throw new Error(sourceError.message);
    if (!source) throw new Error("i4_authoring_rejected: composition not found");
    await assertI4AuthoringTree({
      context,
      tree: (source.current_draft as unknown as CompositionTree | undefined) ?? EMPTY_TREE,
      pageType: String(source.page_type),
      operation: "duplicate",
    });
    const { data: id, error } = await context.supabase.rpc("eb_duplicate_composition", {
      _id: data.id,
      _new_slug: data.new_slug,
      _new_title: data.new_title ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const renameComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; new_title: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_rename_composition", {
      _id: data.id,
      _new_title: data.new_title,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCompositionSlug = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; new_slug: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_update_composition_slug", {
      _id: data.id,
      _new_slug: data.new_slug,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_archive_composition", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unarchiveComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_unarchive_composition", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteComposition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("eb_delete_composition", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markCompositionAsTemplate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; is_template: boolean; template_of_kind?: PageKind | null }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    if (data.is_template) {
      const { data: source, error: sourceError } = await context.supabase
        .from("page_compositions")
        .select("current_draft, page_type")
        .eq("id", data.id)
        .maybeSingle();
      if (sourceError) throw new Error(sourceError.message);
      if (!source) throw new Error("i4_authoring_rejected: composition not found");
      await assertI4AuthoringTree({
        context,
        tree: (source.current_draft as unknown as CompositionTree | undefined) ?? EMPTY_TREE,
        pageType: String(source.page_type),
        operation: "template_new",
      });
    }
    const { error } = await context.supabase.rpc("eb_mark_composition_as_template", {
      _id: data.id,
      _is_template: data.is_template,
      _template_of_kind: data.template_of_kind ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
