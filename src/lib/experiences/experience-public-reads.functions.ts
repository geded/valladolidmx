/**
 * Experiencias · Server functions del listado maestro.
 *
 * Lote 3E — CMS-first, fuente canónica única (`products` con
 * `product_type = 'experiencia'`):
 *  - `getExperiencesListing`: lectura PÚBLICA. Sólo registros publicados de
 *    empresas publicadas (RLS `TO anon`). No admite parámetros que amplíen
 *    el estado editorial.
 *  - `getExperiencesReviewListing`: revisión INTERNA (superficies
 *    `/lovable/*`, noindex). Requiere sesión de editor/admin y aplica RLS
 *    como esa persona; incluye `in_review` y marca los registros DEMO.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ExperiencesListingResult } from "./experience-public-reads.server";

function destinoOf(data: { destino?: unknown } | undefined): string | null {
  return typeof data?.destino === "string" && data.destino.trim() ? data.destino.trim() : null;
}

export const getExperiencesListing = createServerFn({ method: "GET" })
  .inputValidator((data: { destino?: unknown } | undefined) => ({ destino: destinoOf(data) }))
  .handler(async ({ data }): Promise<ExperiencesListingResult> => {
    const { listExperiencesListing } = await import("./experience-public-reads.server");
    return listExperiencesListing(data);
  });

export const getExperiencesReviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { destino?: unknown } | undefined) => ({ destino: destinoOf(data) }))
  .handler(async ({ data, context }): Promise<ExperiencesListingResult> => {
    const { data: allowed, error } = await context.supabase.rpc("is_editor_or_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(`role_check_failed:${error.message}`);
    if (!allowed) throw new Error("forbidden");
    const { listExperiencesListing } = await import("./experience-public-reads.server");
    return listExperiencesListing(data, {
      client: context.supabase,
      statuses: ["published", "in_review"],
      markDemo: true,
    });
  });
