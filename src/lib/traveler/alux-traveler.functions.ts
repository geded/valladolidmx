/**
 * Iniciativa 7 · Sub-ola G — Backend Alux Traveler (read-only + advisory).
 *
 * Contrato aprobado en Sub-ola F:
 *  - Único carril de contexto: RPC `traveler_alux_context_for_user`.
 *  - No lee `destinations`, `businesses`, `products`, `events`,
 *    `page_compositions` ni `concierge_cases` directo. Todo enriquecimiento
 *    de catálogo va vía las public-reads server fns ya aprobadas.
 *  - No muta el Travel Workspace. Sólo redacta sugerencias.
 *  - Cada capacidad devuelve `rationale + sources` + disclaimer.
 *  - Log obligatorio por capacidad vía `alux_traveler_log_suggestion`.
 *
 * Prohibiciones v1:
 *  - No reserva, no modifica el plan, no envía al Concierge, no genera
 *    cotizaciones, no contacta empresas, no crea pagos, no persiste
 *    memoria conversacional propia.
 *
 * Patrón calcado de `src/lib/concierge/alux.functions.ts` (14.60.6).
 */
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Json } from "@/integrations/supabase/types";
import { resolveAluxSettingsServer } from "@/lib/alux/settings.functions";
import {
  retrieveAluxKnowledgeServer,
  knowledgeToPromptBlock,
  ALUX_KB_LOCALES,
  type AluxKbLocale,
} from "@/lib/alux/knowledge.functions";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const DISCLAIMER =
  "Sugerencia generada por Alux. Nunca modifica tu viaje sin tu confirmación.";

// ---------- Capacidades v1 (lista cerrada) ----------

const CAPABILITIES = [
  "suggest_experiences",
  "suggest_restaurants",
  "suggest_hotels",
  "improve_trip",
  "detect_gaps",
  "draft_concierge_message",
  "suggest_from_coupons",
  "discover_promotions",
] as const;

export type AluxTravelerCapability = (typeof CAPABILITIES)[number];

// ---------- Contratos I/O ----------

const LocaleField = z.enum(ALUX_KB_LOCALES).optional();

const EmptyInput = z
  .object({ locale: LocaleField })
  .optional()
  .default({});

const CapabilityInput = z.object({
  planId: z.string().uuid().optional(),
  focus: z.string().max(500).optional(),
  locale: LocaleField,
});

const LOCALE_DIRECTIVES: Record<AluxKbLocale, string> = {
  es: "Responde SIEMPRE en español neutro.",
  en: "ALWAYS respond in natural English. Keep proper names, addresses, prices and URLs unchanged.",
  fr: "Réponds TOUJOURS en français naturel. Conserve tels quels les noms propres, adresses, prix et URLs.",
  de: "Antworte IMMER auf natürlichem Deutsch. Eigennamen, Adressen, Preise und URLs unverändert lassen.",
  it: "Rispondi SEMPRE in italiano naturale. Mantieni invariati nomi propri, indirizzi, prezzi e URL.",
  pt: "Responda SEMPRE em português natural. Mantenha inalterados nomes próprios, endereços, preços e URLs.",
};

const LogInput = z.object({
  capability: z.enum(CAPABILITIES),
  planId: z.string().uuid().optional(),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

export interface AluxTravelerSource {
  kind: string;
  target_id: string | null;
  slug: string | null;
  title: string | null;
}

export interface AluxTravelerSuggestion {
  capability: AluxTravelerCapability;
  model: string;
  text: string;
  rationale: string;
  sources: AluxTravelerSource[];
  reversible: true;
  latency_ms: number;
  disclaimer: string;
  knowledge_ids: string[];
}

// ---------- Helpers ----------

type RpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function requireApiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

async function fetchTravelerContext(supabase: unknown): Promise<unknown> {
  const c = supabase as RpcClient;
  const { data, error } = await c.rpc("traveler_alux_context_for_user", {});
  if (error) throw new Error(error.message);
  return data;
}

async function logSuggestion(
  supabase: unknown,
  capability: AluxTravelerCapability,
  planId: string | null,
  meta: Record<string, unknown>,
) {
  const c = supabase as RpcClient;
  const { error } = await c.rpc("alux_traveler_log_suggestion", {
    _capability: capability,
    _plan_id: planId,
    _meta: meta,
  });
  if (error) throw new Error(error.message);
}

function extractSources(context: unknown): AluxTravelerSource[] {
  const refs = (context as { catalog_refs?: unknown } | null)?.catalog_refs;
  if (!Array.isArray(refs)) return [];
  return refs.slice(0, 20).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      kind: String(row.kind ?? ""),
      target_id: (row.target_id as string | null) ?? null,
      slug: (row.slug as string | null) ?? null,
      title: (row.title as string | null) ?? null,
    };
  });
}

function contextActivePlanId(context: unknown): string | null {
  const active = (context as { active_plan?: { plan?: { id?: string } } } | null)
    ?.active_plan?.plan?.id;
  return typeof active === "string" ? active : null;
}

const SYSTEM_BASE =
  "Eres Alux, asistente del viajero en Valladolid.mx. Respondes en el idioma indicado por la directiva de idioma, siempre breve y honesto. Trabajas SÓLO con la información del contexto entregado (perfil del viajero, plan activo, referencias del catálogo). Nunca inventas empresas, precios, horarios ni disponibilidad. Nunca reservas, nunca modificas el plan, nunca envías al concierge, nunca contactas empresas. Sólo sugieres, explicas y redactas. Cuando cites algo, usa exactamente el título tal como aparece en las referencias.";

const RATIONALE_INSTRUCTION =
  "Formato de respuesta OBLIGATORIO en dos secciones Markdown. Mantén los encabezados EXACTAMENTE como aparecen aquí (en español) aunque el cuerpo esté en otro idioma:\n" +
  "## Sugerencia\n<contenido en el idioma solicitado>\n\n## Por qué\n<1–3 líneas de razonamiento en el idioma solicitado>";

async function runAluxTraveler(
  capability: AluxTravelerCapability,
  systemExtra: string,
  userPrompt: string,
  supabase: unknown,
  locale: AluxKbLocale = "es",
): Promise<AluxTravelerSuggestion> {
  const context = await fetchTravelerContext(supabase);
  const planId = contextActivePlanId(context);
  const sources = extractSources(context);

  // Ola A2 · Inyección de la Base de Conocimiento (M4).
  const settings = await resolveAluxSettingsServer(supabase).catch(() => null);
  let knowledgeBlock = "";
  let knowledgeCount = 0;
  let knowledgeIds: string[] = [];
  if (!settings || settings.flags.m4_knowledge) {
    const query = [capability, userPrompt].join(" ").slice(0, 500);
    const matches = await retrieveAluxKnowledgeServer(supabase, query, {
      matchCount: 4,
      locale,
    });
    knowledgeCount = matches.length;
    knowledgeIds = matches
      .map((m) => (m as { id?: string }).id)
      .filter((v): v is string => typeof v === "string");
    knowledgeBlock = knowledgeToPromptBlock(matches, { locale });
  }

  const provider = createLovableAiGatewayProvider(requireApiKey());
  const t0 = Date.now();
  const { text, usage } = await generateText({
    model: provider(DEFAULT_MODEL),
    system: [
      SYSTEM_BASE,
      LOCALE_DIRECTIVES[locale],
      systemExtra,
      knowledgeBlock,
      RATIONALE_INSTRUCTION,
    ]
      .filter(Boolean)
      .join("\n\n"),
    prompt:
      userPrompt +
      "\n\nContexto del viajero (JSON):\n```json\n" +
      JSON.stringify(context ?? {}).slice(0, 24_000) +
      "\n```",
  });
  const latency = Date.now() - t0;

  // Separa cuerpo y rationale para consumo estructurado por la UI (Sub-ola H).
  const parts = text.split(/##\s*Por qué\s*/i);
  const body = (parts[0] ?? text).replace(/^##\s*Sugerencia\s*/i, "").trim();
  const rationale = (parts[1] ?? "").trim();

  await logSuggestion(supabase, capability, planId, {
    model: DEFAULT_MODEL,
    latency_ms: latency,
    tokens_in: usage?.inputTokens ?? null,
    tokens_out: usage?.outputTokens ?? null,
    sources_count: sources.length,
    kb_matches: knowledgeCount,
  });

  return {
    capability,
    model: DEFAULT_MODEL,
    text: body,
    rationale,
    sources,
    reversible: true,
    latency_ms: latency,
    disclaimer: DISCLAIMER,
    knowledge_ids: knowledgeIds,
  };
}

// =========================================================================
// Server functions expuestas
// =========================================================================

/**
 * getAluxTravelerContext — Proyección oficial del Travel Workspace para
 * Alux. Único carril de lectura del contexto autorizado.
 */
export const getAluxTravelerContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmptyInput.parse(d ?? {}))
  .handler(async ({ context }) => {
    const ctx = await fetchTravelerContext(context.supabase);
    return (ctx ?? null) as Json | null;
  });

/**
 * logAluxTravelerSuggestion — Wrapper explícito para asentar sugerencias
 * mostradas al viajero (aceptadas, descartadas, etc.). No genera texto.
 */
export const logAluxTravelerSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LogInput.parse(d))
  .handler(async ({ data, context }) => {
    await logSuggestion(
      context.supabase,
      data.capability,
      data.planId ?? null,
      data.meta,
    );
    return { ok: true };
  });

/**
 * suggestExperiences — Recomienda experiencias del catálogo compatibles
 * con el plan y perfil actuales.
 */
export const suggestExperiences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) =>
    runAluxTraveler(
      "suggest_experiences",
      "Sólo recomiendas experiencias que aparezcan en las referencias del contexto (catalog_refs). Si no hay experiencias compatibles, dilo abiertamente y sugiere qué preferencia falta declarar.",
      "Sugiere hasta 3 experiencias del catálogo compatibles con el plan activo y el perfil del viajero" +
        (data.focus ? `. Foco solicitado: ${data.focus}` : "") +
        ". Para cada una: título, por qué encaja (1 línea) y qué momento del viaje ocupa. No inventes títulos.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * suggestRestaurants — Recomienda restaurantes del catálogo.
 */
export const suggestRestaurants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) =>
    runAluxTraveler(
      "suggest_restaurants",
      "Sólo recomiendas restaurantes que aparezcan en las referencias del contexto. Respeta restricciones dietéticas y accesibilidad del perfil.",
      "Sugiere hasta 3 restaurantes del catálogo compatibles con el plan activo" +
        (data.focus ? `. Foco: ${data.focus}` : "") +
        ". Para cada uno: nombre, tipo de cocina si consta en el contexto y motivo. No inventes menús ni precios.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * suggestHotels — Recomienda hospedajes del catálogo.
 */
export const suggestHotels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) =>
    runAluxTraveler(
      "suggest_hotels",
      "Sólo recomiendas hospedajes que aparezcan en las referencias del contexto. Respeta presupuesto declarado (budget_band) y accesibilidad.",
      "Sugiere hasta 3 hospedajes del catálogo compatibles con la duración y perfil del viaje" +
        (data.focus ? `. Foco: ${data.focus}` : "") +
        ". Para cada uno: nombre, encaje con presupuesto/perfil y motivo. No confirmes disponibilidad ni tarifas.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * improveMyTrip — Sugiere mejoras de ritmo, orden y duración sobre el plan
 * activo. No modifica el plan.
 */
export const improveMyTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) =>
    runAluxTraveler(
      "improve_trip",
      "Sólo puedes reordenar mentalmente el plan y sugerir cambios. NUNCA aplicas la modificación: el viajero decide desde la UI.",
      "Analiza el plan activo y propone hasta 3 mejoras concretas (ritmo, orden, duración por día, alternancia de intensidad)" +
        (data.focus ? `. Foco: ${data.focus}` : "") +
        ". Para cada mejora indica qué cambiaría y por qué mejora la experiencia del viajero.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * detectPlanGaps — Detecta huecos operativos del plan activo.
 */
export const detectPlanGaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmptyInput.parse(d ?? {}))
  .handler(async ({ context }) =>
    runAluxTraveler(
      "detect_gaps",
      "Sólo observas huecos evidentes en el plan activo. No inventas: si el plan no tiene fechas, dilo.",
      "Detecta huecos del plan activo: días sin actividad, tramos sin comida planeada, falta de hospedaje, falta de transporte entre destinos distantes, sobrecarga de actividades intensas seguidas. Para cada hueco: descripción y sugerencia de acción no destructiva.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * draftConciergeMessage — Redacta un mensaje que el viajero podría enviar
 * al Concierge desde la UI existente. NO ENVÍA. El envío real sigue siendo
 * `promotePlanToCase` disparado por el usuario (Sub-ola E).
 */
export const draftConciergeMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) =>
    runAluxTraveler(
      "draft_concierge_message",
      "Redactas UN borrador de mensaje del viajero hacia el concierge humano. No envías nada. No prometes precios ni disponibilidad. Tono cordial, primera persona, español neutro.",
      "Redacta un borrador corto (máx. 180 palabras) para que el viajero solicite ayuda del Concierge sobre su plan activo" +
        (data.focus ? `. Foco: ${data.focus}` : "") +
        ". Incluye: qué ya definió, qué necesita resolver y qué tipo de propuesta espera. El envío final lo hace el viajero desde la UI.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * suggestFromCoupons — Ola 4: recomienda cómo aprovechar los cupones
 * activos del viajero, cruzándolos con su plan y perfil. NO reserva,
 * NO redime; solo sugiere. Los cupones vienen en `active_coupons` del
 * contexto (nunca inventa códigos ni descuentos).
 */
export const suggestFromCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) =>
    runAluxTraveler(
      "suggest_from_coupons",
      "Sólo trabajas con cupones que aparezcan en `active_coupons` del contexto. NUNCA inventes códigos, descuentos, negocios ni vigencias. Si `active_coupons` está vacío o hay pocos cupones activos, dilo abiertamente e invita explícitamente al viajero a visitar /promociones para reclamar promociones nuevas (incluye el enlace textual `/promociones`). Nunca redimes: el viajero canjea desde el negocio con su QR.",
      "Analiza los cupones activos del viajero y sugiere cómo aprovecharlos en su viaje" +
        (data.focus ? `. Foco: ${data.focus}` : "") +
        ". Para cada cupón cita: título exacto, negocio, % de descuento (si lo trae), vigencia (fecha) y en qué momento del plan (o del recorrido por el Oriente Maya) le conviene usarlo. Si un cupón está por vencer, priorízalo. Cierra recordando que puede descubrir más promociones en /promociones. No inventes menús ni tarifas.",
      context.supabase,
      data.locale ?? "es",
    ),
  );

/**
 * discoverPromotions — Ola 4 (bis): recomienda promociones publicadas que
 * el viajero AÚN NO ha reclamado, cruzándolas con su perfil, plan activo y
 * cupones ya activos. NO reclama por él; solo sugiere y lo invita a
 * visitar /promociones. Fuente única de promociones: la vitrina pública
 * `page_compositions` (kind=promotion), leída server-side.
 */
export const discoverPromotions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CapabilityInput.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    // Fuente única y publishable-only. Sin admin, sin RLS bypass.
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows } = await sb
      .from("page_compositions")
      .select("slug, title, description")
      .eq("kind", "promotion")
      .eq("status", "published")
      .eq("is_template", false)
      .order("published_at", { ascending: false })
      .limit(12);
    const baseSlugs = (rows ?? []).map((r) => r.slug as string);

    // Ola 7 · Sub-ola 7.4.c — Prioridad Alux por plan de visibilidad.
    // Enriquecemos cada promo con business_id (vía tabla `promotions`) y
    // luego con `business_effective_visibility.levers` para leer
    // `alux_weight` y `alux_proactive`. Ordenamos por weight desc.
    const promoRows = baseSlugs.length
      ? (
          await sb
            .from("promotions")
            .select("slug, business_id")
            .in("slug", baseSlugs)
        ).data ?? []
      : [];
    const bizBySlug = new Map<string, string>();
    for (const p of promoRows) {
      const s = (p as { slug?: string }).slug;
      const b = (p as { business_id?: string }).business_id;
      if (s && b) bizBySlug.set(s, b);
    }
    const bizIds = Array.from(new Set(bizBySlug.values()));
    const visRows = bizIds.length
      ? (
          await sb
            .from("business_effective_visibility")
            .select("business_id, plan_slug, plan_name, levers")
            .in("business_id", bizIds)
        ).data ?? []
      : [];
    const visByBiz = new Map<string, { plan_slug: string; plan_name: string; levers: Record<string, unknown> }>();
    for (const v of visRows) {
      const id = (v as { business_id?: string }).business_id;
      if (!id) continue;
      visByBiz.set(id, {
        plan_slug: String((v as { plan_slug?: string }).plan_slug ?? "basico"),
        plan_name: String((v as { plan_name?: string }).plan_name ?? "Básico"),
        levers: ((v as { levers?: Record<string, unknown> }).levers ?? {}) as Record<string, unknown>,
      });
    }

    const scored = (rows ?? []).map((r) => {
      const slug = r.slug as string;
      const businessId = bizBySlug.get(slug) ?? null;
      const vis = businessId ? visByBiz.get(businessId) : undefined;
      const levers = vis?.levers ?? {};
      const weight = Number((levers as { alux_weight?: unknown }).alux_weight ?? 1);
      const proactive = Boolean((levers as { alux_proactive?: unknown }).alux_proactive);
      return {
        slug,
        title: (r.title as string) ?? slug,
        description: (r.description as string) ?? null,
        url: `/promociones/${slug}`,
        plan: vis?.plan_name ?? "Básico",
        alux_weight: Number.isFinite(weight) ? weight : 1,
        alux_proactive: proactive,
      };
    });
    scored.sort((a, b) => {
      if (a.alux_proactive !== b.alux_proactive) return a.alux_proactive ? -1 : 1;
      return b.alux_weight - a.alux_weight;
    });
    const promos = scored.slice(0, 8);

    const promosBlock =
      promos.length === 0
        ? "\n\nPromociones publicadas actualmente: (ninguna)."
        : "\n\nPromociones publicadas (fuente única, no inventes otras):\n```json\n" +
          JSON.stringify(promos).slice(0, 8_000) +
          "\n```";

    return runAluxTraveler(
      "discover_promotions",
      "Sólo puedes recomendar promociones que aparezcan en la lista `Promociones publicadas`. NUNCA inventes títulos, negocios, descuentos ni vigencias. Respeta el orden de la lista: viene priorizado por `alux_weight` y `alux_proactive` del plan de visibilidad de cada negocio (los primeros son los que más te conviene mencionar primero). Si un item trae `alux_proactive: true`, tienes autorización comercial para promoverlo de forma explícita cuando encaje con el viajero. Contrasta con `active_coupons` del contexto: NO recomiendes promociones cuyo cupón el viajero YA reclamó. Si no hay promociones publicadas, dilo con claridad e invita a volver más tarde. Nunca reclamas ni redimes por el viajero: él debe abrir el enlace y reclamar desde /promociones.",
      "Sugiere hasta 3 promociones vigentes que le convengan al viajero según su perfil y plan activo" +
        (data.focus ? `. Foco: ${data.focus}` : "") +
        ". Para cada una: título exacto, por qué encaja en 1 línea y URL exacta (usa el campo `url` provisto). Cierra con una invitación clara a visitar /promociones para ver el catálogo completo y reclamar el cupón digital." +
        promosBlock,
      context.supabase,
      data.locale ?? "es",
    );
  });