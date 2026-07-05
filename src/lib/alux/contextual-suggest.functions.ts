/**
 * aluxContextualSuggest — Sugerencias contextuales explicables para el
 * Concierge IA Alux (US-E1.2, Épica E1, Programa E · Carril A · v2.5).
 *
 * Rol: alimentar la sección "Qué explorar cerca" del Sheet contextual
 * público de `AluxFloatingTrigger` con recomendaciones reales derivadas
 * del catálogo publicado, coherentes con el snapshot territorial del
 * Context Engine.
 *
 * AT-1 · Alux Traveler productivo (2026-07-05):
 *  · Ahora enriquece los rationales vía Lovable AI Gateway
 *    (`google/gemini-3-flash-preview`) con GROUNDING estricto: el modelo
 *    SOLO puede reordenar y redactar `rationale` sobre candidatos reales
 *    del catálogo — no puede inventar ids, slugs ni entidades.
 *  · Tono: cálido, colonial, español neutro, ≤140 chars por rationale.
 *  · Fallback determinístico intacto: si el gateway falla, no responde
 *    a tiempo, o el modelo devuelve algo no válido, se usan los
 *    rationales textuales calculados en código. Nunca degradamos a UI
 *    rota o sugerencias vacías.
 *  · Público (anon). Sin persistencia por request: la sesión ya cachea
 *    con `staleTime` en el cliente; persistir por visitante anónimo no
 *    aporta valor y genera ruido.
 *
 * Reglas permanentes:
 *  · Público (anon). Sin acceso a perfil, plan, expediente ni tablas privadas.
 *  · Recuperación determinista sobre `businesses` publicados con las mismas
 *    policies públicas que ya usa Discovery. Nunca inventa entidades.
 *  · Sólo Oriente Maya: si `region.slug ≠ oriente-maya`, responde vacío.
 *  · Cada sugerencia declara `rationale` humano y `source` (tabla+id),
 *    alineado con el contrato Explainable-by-Default (Política 06).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

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
  readonly categorySlug?: string;
  readonly categoryName?: string;
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
  /** "ai" cuando Alux enriqueció los rationales; "deterministic" en fallback. */
  readonly rationaleSource?: "ai" | "deterministic";
  /**
   * Estado del enriquecimiento AI. Permite a la UI mostrar un mensaje
   * discreto cuando Alux está momentáneamente sin cuota/rate-limit,
   * sin romper las sugerencias (que siguen sirviéndose desde catálogo).
   */
  readonly aiStatus?: "ok" | "skipped" | "rate_limited" | "credits_exhausted" | "error";
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
    const destination = dest;

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
    const destinationLabel = data.destination?.label ?? destination.name;
    function deterministicRationale(row: BizRow): string {
      if (currentProductSlug && currentBusinessSlug) {
        return row.category_slug === currentCategorySlug
          ? `Otra opción de ${row.category_name || currentCategorySlug} en ${destinationLabel}, cerca de ${data.business?.label ?? currentBusinessSlug}.`
          : `Complementa tu visita en ${destinationLabel} con ${row.category_name || "otra experiencia"}.`;
      }
      if (currentBusinessSlug) {
        return row.category_slug === currentCategorySlug
          ? `Alternativa de ${row.category_name || currentCategorySlug} en ${destinationLabel}.`
          : `También destacado en ${destinationLabel}: ${row.category_name || "explora otra categoría"}.`;
      }
      if (currentCategorySlug) {
        return `Publicado en ${row.category_name || currentCategorySlug}, ${destinationLabel}.`;
      }
      return `Destacado en ${destinationLabel}${row.category_name ? ` · ${row.category_name}` : ""}.`;
    }

    function buildSuggestion(row: BizRow, rationale: string): AluxContextualSuggestion {
      const href = `/oriente-maya/${destination.slug}/${row.category_slug || "empresas"}/${row.slug}`;
      const clean = rationale.trim().replace(/\s+/g, " ");
      const safeRationale = clean.length > 0 && clean.length <= 200 ? clean : deterministicRationale(row);
      return {
        kind: "business" as const,
        slug: row.slug,
        label: row.display_name,
        href,
        rationale: safeRationale,
        categorySlug: row.category_slug || undefined,
        categoryName: row.category_name || undefined,
        source: { table: "businesses", id: row.id },
      };
    }

    // 4a. Enriquecimiento con Alux (Lovable AI Gateway).
    const lovableApiKey = process.env.LOVABLE_API_KEY;
    let aiRationales: Map<string, string> | null = null;
    let aiStatus: NonNullable<AluxContextualSuggestResult["aiStatus"]> =
      lovableApiKey && picks.length > 0 ? "ok" : "skipped";
    if (lovableApiKey && picks.length > 0) {
      try {
        const gateway = createLovableAiGatewayProvider(lovableApiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const contextLine = [
          `Destino: ${destinationLabel}`,
          currentCategorySlug ? `Categoría activa: ${data.category?.label ?? currentCategorySlug}` : null,
          currentBusinessSlug ? `Empresa activa: ${data.business?.label ?? currentBusinessSlug}` : null,
          currentProductSlug ? `Producto activo: ${data.product?.label ?? currentProductSlug}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        const catalogBlock = picks
          .map(
            (row, i) =>
              `${i + 1}. id="${row.id}" · ${row.display_name}${row.category_name ? ` (${row.category_name})` : ""}${row.tagline ? ` — ${row.tagline}` : ""}`,
          )
          .join("\n");

        const prompt = [
          "Eres Alux, Concierge IA del Oriente Maya (Yucatán, México).",
          "Tono cálido, colonial, cercano, en español neutro. Nunca marketing agresivo.",
          "",
          `Contexto del visitante: ${contextLine}.`,
          "",
          "Candidatos reales del catálogo publicado (usa SOLO estos ids):",
          catalogBlock,
          "",
          "Para cada id, redacta un rationale breve (máx 140 caracteres) explicando por qué se lo sugieres al visitante ahora, considerando su contexto activo. No inventes atributos, precios, distancias ni horarios que no aparezcan en la lista. No repitas literalmente el nombre del lugar en el rationale. Devuelve exactamente un rationale por id.",
        ].join("\n");

        const AiSchema = z.object({
          picks: z.array(
            z.object({
              id: z.string().min(1).max(64),
              rationale: z.string().min(1).max(220),
            }),
          ),
        });

        const { output } = await generateText({
          model,
          output: Output.object({ schema: AiSchema }),
          prompt,
          abortSignal: AbortSignal.timeout(6_000),
        });

        const validIds = new Set(picks.map((p) => p.id));
        aiRationales = new Map();
        for (const p of output.picks) {
          if (validIds.has(p.id)) aiRationales.set(p.id, p.rationale);
        }
        if (aiRationales.size === 0) aiRationales = null;
        if (!aiRationales) aiStatus = "error";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/\b429\b|rate.?limit/i.test(message)) aiStatus = "rate_limited";
        else if (/\b402\b|credit/i.test(message)) aiStatus = "credits_exhausted";
        else aiStatus = "error";
        if (!NoObjectGeneratedError.isInstance(error)) {
          console.warn("[alux.contextual-suggest] AI enrichment failed, using deterministic fallback:", error);
        }
        aiRationales = null;
      }
    }

    const suggestions: AluxContextualSuggestion[] = picks.map((row) => {
      const aiRationale = aiRationales?.get(row.id);
      return buildSuggestion(row, aiRationale ?? deterministicRationale(row));
    });
    const rationaleSource: "ai" | "deterministic" = aiRationales ? "ai" : "deterministic";

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
          ? rationaleSource === "ai"
            ? `Alux te sugiere estas opciones en ${destinationLabel}, con base en tu recorrido actual.`
            : `Sugerencias derivadas del catálogo publicado en ${destinationLabel}.`
          : `Aún no hay más publicaciones en ${destinationLabel} para sugerir.`,
      rationaleSource,
      aiStatus,
    };
  });
