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
import { computeOpenNow, type OpenNowState } from "@/lib/business/open-now";

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
  /**
   * A6 · Viajero Consciente — Hints M2 desde el cliente autenticado.
   * Fuente única aceptada: `getAluxTravelerLens` (server fn autenticada).
   * El servidor los trata como coloración de prompt, nunca como fuente
   * de verdad de acceso.
   */
  travelerHints: z
    .object({
      home_country: z.string().max(60).nullable().optional(),
      preferred_language: z.string().max(40).nullable().optional(),
      travel_style: z.string().max(60).nullable().optional(),
      budget_band: z.string().max(40).nullable().optional(),
      dietary: z.array(z.string().max(60)).max(8).optional(),
      accessibility: z.array(z.string().max(60)).max(8).optional(),
      languages: z.array(z.string().max(40)).max(8).optional(),
      interests: z.array(z.string().max(60)).max(10).optional(),
    })
    .optional(),
  /** Slugs de negocios donde el viajero ya tiene un cupón activo. */
  activeCouponBusinessSlugs: z.array(z.string().max(120)).max(20).optional(),
  /**
   * A14 · Intención de viaje detectada en cliente. El servidor la usa sólo
   * como coloración de prompt; jamás sustituye contexto real ni catálogo.
   */
  travelIntent: z
    .enum([
      "explorando",
      "comparando_hoteles",
      "buscando_comida",
      "planeando_noche",
      "cazando_cupones",
      "perdido",
    ])
    .optional(),
});

export type AluxSuggestKind = "business" | "product" | "event";

export interface AluxSuggestionCta {
  readonly label: string;
  readonly href: string;
  readonly kind: "view" | "directions" | "promotion" | "coupon";
}

export interface AluxContextualSuggestion {
  readonly kind: AluxSuggestKind;
  readonly slug: string;
  readonly label: string;
  readonly href: string;
  readonly rationale: string;
  readonly categorySlug?: string;
  readonly categoryName?: string;
  readonly source: { table: string; id: string };
  readonly ctas?: readonly AluxSuggestionCta[];
  /** True si el viajero ya tiene un cupón activo del negocio. */
  readonly hasActiveCoupon?: boolean;
  /** Slug de una promoción publicada del negocio, si existe. */
  readonly activePromotionSlug?: string;
  /** A7 · Horarios reales. */
  readonly openState?: OpenNowState;
  readonly openLabel?: string;
}

export interface AluxActiveDestinationPromotion {
  readonly slug: string;
  readonly title: string;
  readonly businessSlug: string | null;
  readonly businessName: string | null;
  readonly discountPercent: number | null;
  readonly endsAt: string | null;
  readonly href: string;
}

export interface AluxContextualSuggestResult {
  readonly suggestions: readonly AluxContextualSuggestion[];
  /** Promociones publicadas de negocios del destino activo (top 6). */
  readonly activePromotions?: readonly AluxActiveDestinationPromotion[];
  /** Indica si el prompt usó hints M2 del viajero autenticado. */
  readonly travelerAware?: boolean;
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

    // 2b. Promociones activas de negocios del destino (A6).
    const bizIdsInDest = businesses.map((b) => b.id);
    const bizById = new Map(businesses.map((b) => [b.id, b] as const));
    const nowIso = new Date().toISOString();
    let activePromotions: AluxActiveDestinationPromotion[] = [];
    const promoByBizId = new Map<string, { slug: string; title: string }>();
    if (bizIdsInDest.length) {
      const { data: promoRows } = await sb
        .from("promotions")
        .select("slug, title, business_id, discount_percent, ends_at, starts_at")
        .in("business_id", bizIdsInDest)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(24);
      const items: AluxActiveDestinationPromotion[] = [];
      for (const p of (promoRows ?? []) as Array<{
        slug: string;
        title: string;
        business_id: string | null;
        discount_percent: number | null;
        ends_at: string | null;
        starts_at: string | null;
      }>) {
        if (p.starts_at && p.starts_at > nowIso) continue;
        if (p.ends_at && p.ends_at < nowIso) continue;
        const biz = p.business_id ? bizById.get(p.business_id) : null;
        if (!biz) continue;
        if (!promoByBizId.has(biz.id))
          promoByBizId.set(biz.id, { slug: p.slug, title: p.title });
        items.push({
          slug: p.slug,
          title: p.title,
          businessSlug: biz.slug,
          businessName: biz.display_name,
          discountPercent: p.discount_percent,
          endsAt: p.ends_at,
          href: `/promociones/${p.slug}`,
        });
        if (items.length >= 6) break;
      }
      activePromotions = items;
    }

    const activeCouponSlugSet = new Set(
      (data.activeCouponBusinessSlugs ?? []).map((s) => s.toLowerCase()),
    );

    // 2c. Horarios reales (A7) — precomputa "abierto ahora" por negocio en TZ del destino.
    // Oriente Maya opera en America/Merida (UTC−6 sin DST).
    const openByBizId = new Map<
      string,
      { state: OpenNowState; label: string }
    >();
    if (bizIdsInDest.length) {
      const { data: hoursRows } = await sb
        .from("business_hours")
        .select("business_id, day_of_week, opens_at, closes_at, is_closed")
        .in("business_id", bizIdsInDest);
      const byBiz = new Map<
        string,
        Array<{ day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean | null }>
      >();
      for (const r of (hoursRows ?? []) as Array<{
        business_id: string;
        day_of_week: number;
        opens_at: string | null;
        closes_at: string | null;
        is_closed: boolean | null;
      }>) {
        const arr = byBiz.get(r.business_id) ?? [];
        arr.push({
          day_of_week: r.day_of_week,
          opens_at: r.opens_at,
          closes_at: r.closes_at,
          is_closed: r.is_closed,
        });
        byBiz.set(r.business_id, arr);
      }
      for (const [bizId, arr] of byBiz.entries()) {
        const r = computeOpenNow(arr, { timezone: "America/Merida" });
        openByBizId.set(bizId, { state: r.state, label: r.label });
      }
    }

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

    // A6 · Prioriza cupón activo → promo activa → resto.
    // A7 · Dentro de cada grupo, empuja al final los que sabemos que están cerrados.
    const rank = (b: BizRow): number => {
      // Grupo primario (0 = cupón, 1 = promo, 2 = resto).
      const group = activeCouponSlugSet.has(b.slug.toLowerCase())
        ? 0
        : promoByBizId.has(b.id)
          ? 1
          : 2;
      // Subgrupo por estado (0 = open/unknown, 1 = closed).
      const open = openByBizId.get(b.id);
      const closed = open?.state === "closed" ? 1 : 0;
      return group * 10 + closed;
    };
    ordered.sort((a, b) => rank(a) - rank(b));
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
      const hasActiveCoupon = activeCouponSlugSet.has(row.slug.toLowerCase());
      const promo = promoByBizId.get(row.id) ?? null;
      const open = openByBizId.get(row.id);
      const ctas: AluxSuggestionCta[] = [
        { kind: "view", label: "Ver ficha", href },
        {
          kind: "directions",
          label: "Cómo llegar",
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${row.display_name} ${destinationLabel} Yucatán México`,
          )}`,
        },
      ];
      if (hasActiveCoupon) {
        ctas.push({
          kind: "coupon",
          label: "Ver mi cupón",
          href: "/cuenta/cupones",
        });
      } else if (promo) {
        ctas.push({
          kind: "promotion",
          label: "Ver promoción",
          href: `/promociones/${promo.slug}`,
        });
      }
      return {
        kind: "business" as const,
        slug: row.slug,
        label: row.display_name,
        href,
        rationale: safeRationale,
        categorySlug: row.category_slug || undefined,
        categoryName: row.category_name || undefined,
        source: { table: "businesses", id: row.id },
        ctas,
        hasActiveCoupon: hasActiveCoupon || undefined,
        activePromotionSlug: promo?.slug,
        openState: open?.state,
        openLabel: open?.label,
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

        const hints = data.travelerHints;
        const travelerLine = hints
          ? [
              hints.home_country ? `viene de ${hints.home_country}` : null,
              hints.preferred_language ? `habla ${hints.preferred_language}` : null,
              hints.travel_style ? `estilo ${hints.travel_style}` : null,
              hints.budget_band ? `presupuesto ${hints.budget_band}` : null,
              hints.dietary?.length ? `dieta ${hints.dietary.join(", ")}` : null,
              hints.accessibility?.length ? `accesibilidad ${hints.accessibility.join(", ")}` : null,
              hints.interests?.length ? `intereses ${hints.interests.slice(0, 5).join(", ")}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : null;

        const couponHintLine = activeCouponSlugSet.size
          ? `El viajero YA tiene cupones activos en: ${Array.from(activeCouponSlugSet).slice(0, 6).join(", ")}. Cuando aparezcan en la lista, recuerda con calidez que puede canjearlo (nunca inventes % ni vigencias).`
          : null;

        const intentHintLine = data.travelIntent && data.travelIntent !== "explorando"
          ? (() => {
              const map: Record<string, string> = {
                comparando_hoteles: "El viajero está comparando hoteles ahora — prioriza diferenciadores concretos (zona, ambiente, servicios) y evita generalidades.",
                buscando_comida: "El viajero está buscando dónde comer — prioriza cocina, ambiente y si aplica horario de cocina.",
                planeando_noche: "El viajero está planeando su noche — prioriza opciones abiertas después de las 18h y ambiente nocturno.",
                cazando_cupones: "El viajero está atento a promociones — cuando un candidato tenga [Promo activa] o [Cupón del viajero], mencionalo con naturalidad.",
                perdido: "El viajero lleva rato explorando sin decidir — sé más directo y ofrece un plan concreto, no una lista neutral.",
              };
              return `Intención detectada: ${map[data.travelIntent] ?? ""}`;
            })()
          : null;

        const catalogBlock = picks
          .map(
            (row, i) =>
              `${i + 1}. id="${row.id}" · ${row.display_name}${row.category_name ? ` (${row.category_name})` : ""}${row.tagline ? ` — ${row.tagline}` : ""}${promoByBizId.has(row.id) ? " · [Promo activa]" : ""}${activeCouponSlugSet.has(row.slug.toLowerCase()) ? " · [Cupón del viajero]" : ""}${openByBizId.get(row.id) ? ` · [${openByBizId.get(row.id)!.label}]` : ""}`,
          )
          .join("\n");

        const prompt = [
          "Eres Alux, Concierge IA del Oriente Maya (Yucatán, México).",
          "Tono cálido, colonial, cercano, en español neutro. Nunca marketing agresivo.",
          "",
          `Contexto del visitante: ${contextLine}.`,
          travelerLine ? `Perfil del viajero: ${travelerLine}.` : null,
          couponHintLine,
          intentHintLine,
          "",
          "Candidatos reales del catálogo publicado (usa SOLO estos ids):",
          catalogBlock,
          "",
          "Para cada id, redacta un rationale breve (máx 140 caracteres) explicando por qué se lo sugieres al visitante ahora, considerando su contexto activo y — si aplica — su perfil M2 (estilo, dieta, presupuesto, intereses, país). Si el candidato tiene [Cupón del viajero] o [Promo activa], mencionalo con naturalidad SIN inventar % ni fechas. Si aparece un corchete con [Abierto...] o [Cerrado...], respétalo literalmente cuando decidas cómo hablar del sitio (si está cerrado, evita el imperativo 've ahora' y ofrécelo como plan para más tarde). No inventes horarios, precios ni distancias que no aparezcan en la lista. No repitas literalmente el nombre del lugar en el rationale. Devuelve exactamente un rationale por id.",
        ]
          .filter(Boolean)
          .join("\n");

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
      activePromotions,
      travelerAware: Boolean(data.travelerHints),
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
