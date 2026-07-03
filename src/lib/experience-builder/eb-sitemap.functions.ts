/**
 * Experience Builder · Sitemap Reads (Etapa 15.10.8.5)
 *
 * Lectura mínima para el sitemap dinámico: devuelve el listado de
 * páginas publicadas por el Experience Builder (excluye `home`, que ya
 * está cubierta por la ruta `/`). Usa el cliente admin cargado dentro
 * del handler — no toma input del usuario, solo proyecta campos
 * seguros. Falla cerrada: cualquier error devuelve `[]`.
 */
import { createServerFn } from "@tanstack/react-start";

export interface PublishedPageSitemapEntry {
  slug: string;
  page_type: string;
  published_at: string | null;
  updated_at: string | null;
  /** Prioridad opcional declarada en `snapshot.chrome.seo.priority` (0-1). */
  priority?: number;
  /** Marca opcional de destacado en `snapshot.chrome.seo.featured`. */
  featured?: boolean;
}

export const listPublishedPagesForSitemap = createServerFn({ method: "GET" })
  .handler(async (): Promise<PublishedPageSitemapEntry[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("page_compositions")
        .select("slug, page_type, published_at, updated_at, active_revision_id, page_revisions:active_revision_id(snapshot)")
        .eq("status", "published")
        .neq("page_type", "home")
        .order("published_at", { ascending: false })
        .limit(500);
      if (error || !data) return [];
      return data.map((row) => {
        const snapshot = (row as { page_revisions?: { snapshot?: unknown } }).page_revisions?.snapshot;
        const seo = extractSeo(snapshot);
        return {
          slug: row.slug as string,
          page_type: (row.page_type ?? "generic") as string,
          published_at: (row.published_at ?? null) as string | null,
          updated_at: (row.updated_at ?? null) as string | null,
          priority: typeof seo?.priority === "number" ? seo.priority : undefined,
          featured: seo?.featured === true ? true : undefined,
        };
      });
    } catch {
      return [];
    }
  });

function extractSeo(snapshot: unknown): { priority?: number; featured?: boolean } | undefined {
  if (!snapshot || typeof snapshot !== "object") return undefined;
  const chrome = (snapshot as { chrome?: { seo?: unknown } }).chrome;
  const seo = chrome?.seo;
  if (!seo || typeof seo !== "object") return undefined;
  return seo as { priority?: number; featured?: boolean };
}