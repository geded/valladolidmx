/**
 * aluxContextualSuggest — Sugerencias contextuales explicables para el
 * Concierge IA Alux (US-E1.2, Épica E1, Programa E · Carril A · v2.5).
 *
 * Rol: alimentar la sección "Qué explorar cerca" del Sheet contextual
 * público de `AluxFloatingTrigger` con recomendaciones reales derivadas
 * del catálogo publicado, coherentes con el snapshot territorial del
 * Context Engine.
 *
 * Reglas (Reconciliation Report aprobado):
 *  · Público (anon). Sin autenticación obligatoria. Sin acceso a
 *    perfil, plan, expediente ni tablas privadas.
 *  · Cero motor paralelo: NO invoca modelo AI en esta ola. Recuperación
 *    determinista sobre `businesses` / `products` publicados con las
 *    mismas policies públicas que ya usa Discovery.
 *  · NO toca Alux Traveler ni Alux del Concierge.
 *  · Sólo Oriente Maya: si `region.slug ≠ oriente-maya`, responde vacío.
 *  · Cada sugerencia declara `rationale` humano y `sources` (tabla+id),
 *    alineado con el contrato Explainable-by-Default (Política 06).
 *  · Nunca inventa entidades: cada item existe en el catálogo publicado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SlotSchema = z
  .object({
    slug: z.string().min(1).max(120),
    label: z.string().min(1).max(160),
    href: z.string().max(400).optional(),
  })
  .optional();

const SuggestInput = z.object({
  region: SlotSchema,
  destination: SlotSchema,
  category: SlotSchema,
  business: SlotSchema,
  product: SlotSchema,
  limit: z.number().int().min(1).max(8).optional().default(6),
});

export type AluxSuggestKind = "business" | "product" | "event";

export interface AluxContextualSuggestion {
  readonly kind: AluxSuggestKind;
  readonly slug: string;
  readonly label: string;
  readonly href: string;
  readonly rationale: string;
  readonly source: { table: string; id: string };
}

export interface AluxContextualSuggestResult {
  readonly suggestions: readonly AluxContextualSuggestion[];
  readonly contextSnapshot: {
    destination?: string;
    category?: string;
    business?: string;
    product?: string;
  };
  readonly generatedAt: string;
  readonly reason: string;
}

const EMPTY: AluxContextualSuggestResult = {
  suggestions: [],
  contextSnapshot: {},
  generatedAt: new Date(0).toISOString(),
  reason: "Sin contexto territorial del Oriente Maya.",
};

const HOTEL_CATS = new Set(["hoteles", "hospedaje"]);
const RESTO_CATS = new Set(["restaurantes", "gastronomia"]);
const EXP_CATS = new Set(["experiencias", "experiencias-tours", "tours"]);

function bucketOf(categorySlug: string): "hoteles" | "restaurantes" | "experiencias" | "otras" {
  if (HOTEL_CATS.has(categorySlug)) return "hoteles";
  if (RESTO_CATS.has(categorySlug)) return "restaurantes";
  if (EXP_CATS.has(categorySlug)) return "experiencias";
  return "otras";
}

export const aluxContextualSuggest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestInput.parse(d ?? {}))
  .handler(async ({ data }): Promise<AluxContextualSuggestResult> => {
    // Guard region + destination.
    const regionSlug = data.region?.slug;
    const destSlug = data.destination?.slug;
    if (regionSlug && regionSlug !== "oriente-maya") {
      return { ...EMPTY, reason: "Región fuera del Oriente Maya." };
    }
    if (!destSlug) {
      return { ...EMPTY, reason: "Aún no exploras un destino del Oriente Maya." };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // 1. Destino.
    const { data: dest, error: dErr } = await sb
      .from("destinations")
      .select("id, slug, name")
      .eq("slug", destSlug)
      .maybeSingle();
    if (dErr || !dest) return { ...EMPTY, reason: "Destino no publicado." };

    // 2. Empresas publicadas del destino con su categoría primaria.
    const { data: biz, error: bErr } = await sb
      .from("businesses")
      .select(
        "id, slug, display_name, tagline, business_categories!businesses_primary_category_id_fkey ( slug, name )",
      )
      .eq("destination_id", dest.id)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_name", { ascending: true })
      .limit(60);
    if (bErr) return { ...EMPTY, reason: "No se pudieron cargar empresas del destino." };

    type BizRow = {
      id: string;
      slug: string;
      display_name: string;
      tagline: string | null;
      category_slug: string;
      category_name: string;
    };
    const businesses: BizRow[] = (biz ?? []).map((row) => {
      const cat = (row.business_categories as { slug?: unknown; name?: unknown } | null) ?? null;
      return {
        id: String(row.id),
        slug: String(row.slug),
        display_name: String(row.display_name),
        tagline: (row.tagline as string | null) ?? null,
        category_slug: typeof cat?.slug === "string" ? cat.slug : "",
        category_name: typeof cat?.name === "string" ? cat.name : "",
      };
    });

    // 3. Ranking según nivel de contexto.
    const currentBusinessSlug = data.business?.slug;
    const currentCategorySlug = data.category?.slug;
    const currentProductSlug = data.product?.slug;
    const limit = data.limit ?? 6;

    const seen = new Set<string>();
    const ordered: BizRow[] = [];
    function push(rows: BizRow[]) {
      for (const r of rows) {
        if (r.slug === currentBusinessSlug) continue;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        ordered.push(r);
      }
    }

    if (currentCategorySlug) {
      // Prioridad: mismos hermanos de categoría, luego otras categorías.
      const sameCat = businesses.filter((b) => b.category_slug === currentCategorySlug);
      const otherCats = businesses.filter((b) => b.category_slug !== currentCategorySlug);
      push(sameCat);
      push(otherCats);
    } else {
      // Sólo destino: mezclar categorías principales primero.
      const buckets = { hoteles: [] as BizRow[], restaurantes: [] as BizRow[], experiencias: [] as BizRow[], otras: [] as BizRow[] };
      for (const b of businesses) buckets[bucketOf(b.category_slug)].push(b);
      // Round-robin liviano.
      const rounds = Math.max(buckets.hoteles.length, buckets.restaurantes.length, buckets.experiencias.length, buckets.otras.length);
      for (let i = 0; i < rounds; i++) {
        push([buckets.restaurantes[i], buckets.experiencias[i], buckets.hoteles[i], buckets.otras[i]].filter(Boolean) as BizRow[]);
      }
    }

    const picks = ordered.slice(0, limit);

    // 4. Rationale explicable por item.
    const destinationLabel = data.destination?.label ?? dest.name;
    const suggestions: AluxContextualSuggestion[] = picks.map((row) => {
      let rationale: string;
      if (currentProductSlug && currentBusinessSlug) {
        rationale =
          row.category_slug === currentCategorySlug
            ? `Otra opción de ${row.category_name || currentCategorySlug} en ${destinationLabel}, cerca de ${data.business?.label ?? currentBusinessSlug}.`
            : `Complementa tu visita en ${destinationLabel} con ${row.category_name || "otra experiencia"}.`;
      } else if (currentBusinessSlug) {
        rationale =
          row.category_slug === currentCategorySlug
            ? `Alternativa de ${row.category_name || currentCategorySlug} en ${destinationLabel}.`
            : `También destacado en ${destinationLabel}: ${row.category_name || "explora otra categoría"}.`;
      } else if (currentCategorySlug) {
        rationale = `Publicado en ${row.category_name || currentCategorySlug}, ${destinationLabel}.`;
      } else {
        rationale = `Destacado en ${destinationLabel}${row.category_name ? ` · ${row.category_name}` : ""}.`;
      }
      const href = `/oriente-maya/${dest.slug}/${row.category_slug || "empresas"}/${row.slug}`;
      return {
        kind: "business" as const,
        slug: row.slug,
        label: row.display_name,
        href,
        rationale,
        source: { table: "businesses", id: row.id },
      };
    });

    return {
      suggestions,
      contextSnapshot: {
        destination: destSlug,
        category: currentCategorySlug,
        business: currentBusinessSlug,
        product: currentProductSlug,
      },
      generatedAt: new Date().toISOString(),
      reason:
        suggestions.length > 0
          ? `Sugerencias derivadas del catálogo publicado en ${destinationLabel}.`
          : `Aún no hay más publicaciones en ${destinationLabel} para sugerir.`,
    };
  });
