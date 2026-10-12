/**
 * Busca empresas ya existentes con nombre parecido para evitar duplicados
 * al dar de alta. Lectura editorial con RLS del usuario.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isBusinessMatch } from "@/lib/cms/business-match";

export interface BusinessMatchDTO {
  id: string;
  display_name: string;
  status: string;
  destination: string | null;
  category: string | null;
  hasLogo: boolean;
  hasCover: boolean;
}

export const findMatchingBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) => ({ query: String(d?.query ?? "").slice(0, 120) }))
  .handler(async ({ data, context }): Promise<BusinessMatchDTO[]> => {
    const { data: ok } = await context.supabase.rpc("is_editor_or_admin", {
      _user_id: context.userId,
    });
    if (!ok) throw new Error("forbidden");
    if (data.query.trim().length < 3) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("businesses")
      .select(
        "id, display_name, slug, status, logo_media_id, cover_media_id, destinations(name), business_categories!businesses_primary_category_id_fkey(name)",
      )
      .is("deleted_at", null)
      .neq("status", "archived")
      .limit(3000);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((rows ?? []) as any[])
      .filter((r) => isBusinessMatch(data.query, r.display_name ?? "", r.slug ?? ""))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        display_name: r.display_name,
        status: r.status,
        destination: r.destinations?.name ?? null,
        category: r.business_categories?.name ?? null,
        hasLogo: !!r.logo_media_id,
        hasCover: !!r.cover_media_id,
      }));
  });
