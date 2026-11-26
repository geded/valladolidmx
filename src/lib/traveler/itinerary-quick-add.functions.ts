/**
 * Búsqueda rápida para agregar paradas desde el propio itinerario.
 * Sólo lee empresas y destinos publicados (RLS del viajero) por nombre.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accentInsensitiveOr } from "@/lib/cms/accent-search";

export interface QuickAddHit {
  kind: "business" | "destination";
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
}

export const searchItineraryStops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { term?: unknown }) => {
    const term = typeof d?.term === "string" ? d.term.trim().slice(0, 80) : "";
    return { term };
  })
  .handler(async ({ data, context }): Promise<QuickAddHit[]> => {
    if (data.term.length < 2) return [];
    const bizOr = accentInsensitiveOr(["display_name", "tagline"], data.term);
    const destOr = accentInsensitiveOr(["name"], data.term);
    if (!bizOr || !destOr) return [];
    const [biz, dest] = await Promise.all([
      context.supabase
        .from("businesses")
        .select("id, display_name, tagline, slug")
        .eq("status", "published")
        .is("deleted_at", null)
        .or(bizOr)
        .limit(8),
      context.supabase
        .from("destinations")
        .select("id, name, slug")
        .eq("status", "published")
        .is("deleted_at", null)
        .or(destOr)
        .limit(4),
    ]);
    const out: QuickAddHit[] = [];
    for (const d of dest.data ?? [])
      out.push({ kind: "destination", id: d.id, title: d.name, subtitle: "Destino", slug: d.slug });
    for (const b of biz.data ?? [])
      out.push({ kind: "business", id: b.id, title: b.display_name, subtitle: b.tagline, slug: b.slug });
    return out;
  });
