/**
 * Experience Builder · Server Functions PÚBLICAS (Etapa 15.10.4b · Fase 3)
 *
 * Punto único de resolución pública para CUALQUIER superficie del
 * Experience Builder. Hoy resuelve Landings; en etapas posteriores
 * resolverá destinos, empresas, productos, eventos, bodas, promociones,
 * micrositios y contenido generado por IA — sin modificar su arquitectura.
 *
 * - No requiere autenticación (las RPCs detrás ya filtran por
 *   status='published' + visibility='public').
 * - Usa el cliente publishable de servidor (NO supabaseAdmin).
 * - Devuelve también `cache_version` para que cliente/CDN puedan
 *   invalidar sin recargar el documento.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import type { CompositionTree } from "./composition-tree";

export interface PublicResolveContext {
  locale?: string;
  country?: string;
  audience?: string;
  segment?: string;
  device?: string;
  source?: string;
  campaign?: string;
  tenant_id?: string;
}

export interface PublicPageResolved {
  id: string;
  slug: string;
  name: string;
  kind: string;
  scope: string;
  tenant_id: string | null;
  tree: CompositionTree;
  seo: Record<string, any>;
  open_graph: Record<string, any>;
  schema_org: Record<string, any>;
  marketing: Record<string, any>;
  theme: { id: string; name: string; tokens: Record<string, any> } | null;
  variant: {
    id: string;
    name: string;
    predicate: Record<string, any>;
    overrides: Record<string, any>;
    score: number;
  } | null;
  cache_version: number;
  published_at: string | null;
}

function publicClient() {
  // Lazy import keeps server-only deps out of the client bundle metadata scan.
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    ),
  );
}

export const ebResolvePublicPage = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { slug: string; tenant_id?: string | null; ctx?: PublicResolveContext }) => d,
  )
  .handler(async ({ data }): Promise<PublicPageResolved | null> => {
    const supabase = await publicClient();
    const { data: payload, error } = await supabase.rpc("eb_page_resolve_public", {
      _slug: data.slug,
      _tenant_id: (data.tenant_id ?? null) as unknown as string,
      _ctx: (data.ctx ?? {}) as unknown as Database["public"]["Tables"]["eb_pages"]["Row"]["seo"],
    });
    if (error) throw new Error(error.message);
    return (payload as unknown as PublicPageResolved) ?? null;
  });

/**
 * Aplica los overrides de la variant sobre el árbol base, devolviendo un
 * nuevo árbol (no muta). Contrato de overrides:
 *   { "blocks": { "<node_id>": { "config": { ... } } } }
 * Si la variant no aplica o no hay overrides, devuelve el árbol intacto.
 * Fallback obligatorio: nunca lanza — siempre hay árbol renderizable.
 */
export function applyVariantOverrides(
  tree: CompositionTree,
  overrides: Record<string, any> | null | undefined,
): CompositionTree {
  if (!overrides || typeof overrides !== "object") return tree;
  const blockPatches = (overrides.blocks ?? {}) as Record<
    string,
    { config?: Record<string, unknown> }
  >;
  if (!blockPatches || Object.keys(blockPatches).length === 0) return tree;

  const patchNode = (n: any): any => {
    const patch = blockPatches[n.id];
    const patched = patch?.config
      ? { ...n, config: { ...(n.config ?? {}), ...patch.config } }
      : n;
    if (Array.isArray(patched.children) && patched.children.length > 0) {
      return { ...patched, children: patched.children.map(patchNode) };
    }
    return patched;
  };
  return {
    ...tree,
    root: { ...tree.root, children: tree.root.children.map(patchNode) },
  };
}