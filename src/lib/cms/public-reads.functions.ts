/**
 * cms/public-reads.functions.ts — Lecturas públicas read-only para la
 * Ola 2 (Migración de Contenido). 
 *
 * Reglas:
 *  - Server publishable client (anon, RLS aplica como anon).
 *  - NO usa requireSupabaseAuth: estos endpoints alimentan rutas públicas
 *    (home, listados) que se prerenderizan sin sesión.
 *  - NO usa supabaseAdmin: las políticas TO anon ya autorizan la lectura.
 *  - Sólo proyecta columnas seguras necesarias para el render público.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Destination } from "@/types/territory";
import type { SuggestedRoute } from "@/types/entities";

function publicClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("missing_supabase_public_env");
  }
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export interface PublicHomeCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  palette: "primary" | "selva" | "cenote" | "atardecer";
}

const ALLOWED_PALETTES = new Set(["primary", "selva", "cenote", "atardecer"]);

/**
 * listHomeFeaturedCategories — Devuelve las categorías marcadas con
 * `metadata.home_featured = true` para la sección "Categorías" del home.
 * Filtra status='published' y deleted_at IS NULL (también garantizado por RLS).
 */
export const listHomeFeaturedCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicHomeCategory[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("business_categories")
      .select("id, slug, name, description, icon, sort_order, metadata, status, deleted_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .filter("metadata->>home_featured", "eq", "true")
      .order("sort_order", { ascending: true })
      .limit(24);
    if (error) throw new Error(`home_categories_read_failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const rawPalette = typeof metadata.palette === "string" ? metadata.palette : "primary";
      const palette = (ALLOWED_PALETTES.has(rawPalette) ? rawPalette : "primary") as PublicHomeCategory["palette"];
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description ?? "",
        icon: row.icon ?? "Sparkles",
        palette,
      };
    });
  },
);

const ALLOWED_HERO_PALETTES = new Set(["territorio", "selva", "cenote", "atardecer"]);

/**
 * listPublishedDestinations — Devuelve los destinos publicados junto con el
 * slug de su región turística para el rendering de la sección "Destinos"
 * y rutas territoriales. Lectura read-only mediante cliente publishable;
 * RLS aplica como anon (destinations_public_read).
 */
export const listPublishedDestinations = createServerFn({ method: "GET" }).handler(
  async (): Promise<Destination[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("destinations")
      .select(
        "id, slug, name, tagline, description, hero_palette, highlights, status, deleted_at, tourism_regions ( slug )",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(60);
    if (error) throw new Error(`destinations_read_failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const regionSlug =
        row.tourism_regions && typeof (row.tourism_regions as { slug?: unknown }).slug === "string"
          ? ((row.tourism_regions as { slug: string }).slug)
          : "oriente-maya";
      const heroPalette = ALLOWED_HERO_PALETTES.has(row.hero_palette)
        ? (row.hero_palette as Destination["hero_palette"])
        : "territorio";
      return {
        id: row.id,
        region_slug: regionSlug,
        slug: row.slug,
        name: row.name,
        tagline: row.tagline ?? "",
        long_description: row.description ?? undefined,
        hero_palette: heroPalette,
        highlights: (row.highlights ?? []) as readonly string[],
      };
    });
  },
);

/**
 * listPublishedRoutes — Devuelve las rutas editoriales publicadas y
 * resuelve cada `destination_ids[]` a slugs reales mediante un segundo
 * lookup contra `destinations`. Cliente publishable; RLS aplica como anon
 * (editorial_routes_public_read + destinations_public_read).
 */
export const listPublishedRoutes = createServerFn({ method: "GET" }).handler(
  async (): Promise<SuggestedRoute[]> => {
    const supabase = publicClient();
    const { data: routes, error } = await supabase
      .from("editorial_routes")
      .select("id, slug, name, summary, duration_days, palette, destination_ids, status, deleted_at, published_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: true })
      .limit(24);
    if (error) throw new Error(`routes_read_failed: ${error.message}`);

    const allIds = Array.from(
      new Set((routes ?? []).flatMap((r) => (r.destination_ids ?? []) as string[])),
    );
    const idToSlug = new Map<string, string>();
    if (allIds.length > 0) {
      const { data: dests, error: destErr } = await supabase
        .from("destinations")
        .select("id, slug, status, deleted_at")
        .in("id", allIds)
        .eq("status", "published")
        .is("deleted_at", null);
      if (destErr) throw new Error(`routes_destinations_read_failed: ${destErr.message}`);
      for (const d of dests ?? []) idToSlug.set(d.id, d.slug);
    }

    return (routes ?? []).map((row) => {
      const palette = ALLOWED_HERO_PALETTES.has(row.palette ?? "")
        ? (row.palette as SuggestedRoute["palette"])
        : "territorio";
      const destination_slugs = ((row.destination_ids ?? []) as string[])
        .map((id) => idToSlug.get(id))
        .filter((s): s is string => typeof s === "string");
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        duration_days: row.duration_days,
        summary: row.summary ?? "",
        destination_slugs,
        palette,
      };
    });
  },
);