/**
 * Experience Builder · Server Functions del Studio (Etapa 15.10.4b · Fase 2)
 *
 * Capa de RPC autenticada que respalda al Studio editorial sobre el modelo
 * `eb_*` introducido en la Fase 1. Toda escritura pasa por RPCs
 * SECURITY DEFINER — el cliente NUNCA escribe directamente.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { CompositionTree } from "./composition-tree";

type Json = Database["public"]["Tables"]["eb_pages"]["Row"]["seo"];

export interface EbPageSummary {
  id: string;
  slug: string;
  name: string;
  kind: Database["public"]["Enums"]["eb_page_kind"];
  scope: Database["public"]["Enums"]["eb_scope"];
  status: Database["public"]["Enums"]["eb_publish_status"];
  tenant_id: string | null;
  theme_id: string | null;
  updated_at: string;
}

export interface EbPageDetail extends EbPageSummary {
  tree: CompositionTree;
  seo: Record<string, any>;
  open_graph: Record<string, any>;
  marketing: Record<string, any>;
  current_version_id: string | null;
  published_version_id: string | null;
}

export interface EbVersionSummary {
  id: string;
  page_id: string;
  note: string | null;
  created_at: string;
}

export interface EbThemeSummary {
  id: string;
  name: string;
  scope: Database["public"]["Enums"]["eb_scope"];
  tokens: Record<string, any>;
}

export interface EbVariantSummary {
  id: string;
  page_id: string;
  name: string;
  is_active: boolean;
  overrides: Record<string, any>;
  predicate: Record<string, any>;
}

/* Pages -------------------------------------------------------------- */

export const ebListPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EbPageSummary[]> => {
    const { data, error } = await context.supabase
      .from("eb_pages")
      .select("id, slug, name, kind, scope, status, tenant_id, theme_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as EbPageSummary[];
  });

export const ebGetPage = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<EbPageDetail | null> => {
    const { data: row, error } = await context.supabase
      .from("eb_pages")
      .select(
        "id, slug, name, kind, scope, status, tenant_id, theme_id, updated_at, tree, seo, open_graph, marketing, current_version_id, published_version_id",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const r = row as any;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      kind: r.kind,
      scope: r.scope,
      status: r.status,
      tenant_id: r.tenant_id,
      theme_id: r.theme_id,
      updated_at: r.updated_at,
      current_version_id: r.current_version_id,
      published_version_id: r.published_version_id,
      tree: (r.tree as CompositionTree) ?? { root: { children: [] } },
      seo: (r.seo as Record<string, any>) ?? {},
      open_graph: (r.open_graph as Record<string, any>) ?? {},
      marketing: (r.marketing as Record<string, any>) ?? {},
    };
  });

export const ebUpsertPage = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id?: string;
      slug: string;
      name: string;
      kind?: Database["public"]["Enums"]["eb_page_kind"];
      scope?: Database["public"]["Enums"]["eb_scope"];
      tenant_id?: string | null;
      theme_id?: string | null;
      template_id?: string | null;
      tree?: CompositionTree;
      seo?: Record<string, any>;
      open_graph?: Record<string, any>;
      marketing?: Record<string, any>;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("eb_page_upsert", {
      _payload: data as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const ebSavePageVersion = createServerFn({ method: "POST" })
  .inputValidator((d: { page_id: string; note?: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ version_id: string }> => {
    const { data: vid, error } = await context.supabase.rpc("eb_page_save_version", {
      _page_id: data.page_id,
      _note: data.note ?? "",
    });
    if (error) throw new Error(error.message);
    return { version_id: vid as unknown as string };
  });

export const ebListPageVersions = createServerFn({ method: "GET" })
  .inputValidator((d: { page_id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<EbVersionSummary[]> => {
    const { data: rows, error } = await context.supabase
      .from("eb_page_versions")
      .select("id, page_id, note, created_at")
      .eq("page_id", data.page_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as EbVersionSummary[];
  });

export const ebRestorePageVersion = createServerFn({ method: "POST" })
  .inputValidator((d: { page_id: string; version_id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("eb_page_restore_version", {
      _page_id: data.page_id,
      _version_id: data.version_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const ebPublishPage = createServerFn({ method: "POST" })
  .inputValidator((d: { page_id: string; note?: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ version_id: string }> => {
    const { data: vid, error } = await context.supabase.rpc("eb_page_publish", {
      _page_id: data.page_id,
      _note: data.note ?? "",
    });
    if (error) throw new Error(error.message);
    return { version_id: vid as unknown as string };
  });

export const ebUnpublishPage = createServerFn({ method: "POST" })
  .inputValidator((d: { page_id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("eb_page_unpublish", {
      _page_id: data.page_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* Rollback + cache (Fase 3) ----------------------------------------- */

export const ebRollbackPage = createServerFn({ method: "POST" })
  .inputValidator((d: { page_id: string; version_id: string; note?: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ version_id: string }> => {
    const { data: vid, error } = await context.supabase.rpc("eb_page_rollback", {
      _page_id: data.page_id,
      _version_id: data.version_id,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { version_id: vid as unknown as string };
  });

export const ebInvalidatePageCache = createServerFn({ method: "POST" })
  .inputValidator((d: { page_id: string; reason?: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ cache_version: number }> => {
    const { data: v, error } = await context.supabase.rpc("eb_cache_invalidate", {
      _page_id: data.page_id,
      _reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { cache_version: v as unknown as number };
  });

/* Themes ------------------------------------------------------------- */

export const ebListThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EbThemeSummary[]> => {
    const { data, error } = await context.supabase
      .from("eb_themes")
      .select("id, name, scope, tokens")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      scope: r.scope,
      tokens: (r.tokens as Record<string, any>) ?? {},
    }));
  });

export const ebUpsertTheme = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id?: string;
      name: string;
      scope?: Database["public"]["Enums"]["eb_scope"];
      tenant_id?: string | null;
      tokens: Record<string, any>;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("eb_theme_upsert", {
      _payload: data as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

/* Variants ----------------------------------------------------------- */

export const ebListVariants = createServerFn({ method: "GET" })
  .inputValidator((d: { page_id: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<EbVariantSummary[]> => {
    const { data: rows, error } = await context.supabase
      .from("eb_variants")
      .select("id, page_id, name, is_active, overrides, predicate")
      .eq("page_id", data.page_id)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      page_id: r.page_id,
      name: r.name,
      is_active: r.is_active,
      overrides: (r.overrides as Record<string, any>) ?? {},
      predicate: (r.predicate as Record<string, any>) ?? {},
    }));
  });

export const ebUpsertVariant = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id?: string;
      page_id: string;
      name: string;
      is_active?: boolean;
      overrides?: Record<string, any>;
      predicate?: Record<string, any>;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("eb_variant_upsert", {
      _payload: data as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

/* Preview tokens ----------------------------------------------------- */

export const ebIssuePreviewToken = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      page_id: string;
      version_id?: string | null;
      variant_id?: string | null;
      ttl_minutes?: number;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ token: string }> => {
    const { data: token, error } = await context.supabase.rpc("eb_preview_token_issue", {
      _page_id: data.page_id,
      _version_id: (data.version_id ?? null) as unknown as string,
      _variant_id: (data.variant_id ?? null) as unknown as string,
      _ttl_minutes: data.ttl_minutes ?? 60,
    });
    if (error) throw new Error(error.message);
    return { token: token as unknown as string };
  });

export interface PreviewPayload {
  tree: CompositionTree;
  name: string;
  kind: string;
  theme: { tokens: Record<string, any> } | null;
}

export const ebResolvePreview = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<PreviewPayload | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: payload, error } = await supabase.rpc("eb_preview_resolve", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return (payload as unknown as PreviewPayload) ?? null;
  });