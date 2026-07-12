/**
 * Ola A2 · Alux Knowledge Base (RAG)
 *
 * Server functions para gestionar entradas curadas del territorio y
 * exponer retrieval semántico que consume `runAluxTraveler`/`runAlux`.
 *
 * - Lectura de entradas publicadas: cualquier autenticado (RLS lo garantiza).
 * - Escritura: sólo admin/super_admin (RLS lo garantiza, defensa doble).
 * - Embeddings: OpenAI text-embedding-3-small (1536 dims) vía Lovable AI Gateway.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const CHAT_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const ALUX_KB_LOCALES = ["es", "en", "fr", "de", "it", "pt"] as const;
export type AluxKbLocale = (typeof ALUX_KB_LOCALES)[number];

const LOCALE_NAMES: Record<AluxKbLocale, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  de: "alemán",
  it: "italiano",
  pt: "portugués",
};

export const ALUX_KNOWLEDGE_CATEGORIES = [
  "cultura",
  "historia",
  "gastronomia",
  "clima",
  "transporte",
  "seguridad",
  "costumbres",
  "faq",
  "experiencias",
  "hospedaje",
  "eventos",
  "pueblos_magicos",
  "otros",
] as const;

export type AluxKnowledgeCategory = (typeof ALUX_KNOWLEDGE_CATEGORIES)[number];
export type AluxKnowledgeStatus = "draft" | "published" | "archived";

export interface AluxKnowledgeEntry {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  category: AluxKnowledgeCategory;
  tags: string[];
  source_url: string | null;
  priority: number;
  status: AluxKnowledgeStatus;
  embedded_at: string | null;
  embedding_model: string | null;
  updated_at: string;
}

export interface AluxKnowledgeMatch {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  category: AluxKnowledgeCategory;
  tags: string[];
  source_url: string | null;
  similarity: number;
  locale?: AluxKbLocale;
  is_fallback?: boolean;
}

type SbFrom = {
  from: (t: string) => {
    select: (s: string, o?: { count?: string; head?: boolean }) => {
      order?: (c: string, o?: { ascending?: boolean }) => {
        limit?: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      eq?: (a: string, b: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    insert: (v: Record<string, unknown>) => {
      select: (s: string) => {
        single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }>;
    };
    delete: () => {
      eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }>;
    };
  };
};

type RpcClient = {
  rpc: (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function requireApiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim().slice(0, 24_000);
  if (!trimmed) throw new Error("Texto vacío para embedding");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": requireApiKey(),
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: trimmed }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Embedding gateway ${res.status}: ${msg.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const emb = json.data?.[0]?.embedding;
  if (!Array.isArray(emb) || emb.length !== EMBEDDING_DIMS) {
    throw new Error(`Embedding inválido (dims=${emb?.length ?? 0})`);
  }
  return emb;
}

function pgvectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function ensureAdmin(supabase: unknown, userId: string): Promise<void> {
  const rpc = supabase as RpcClient;
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    rpc.rpc("has_role", { _user_id: userId, _role: "admin" }),
    rpc.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
  ]);
  if (!isAdmin && !isSuper) throw new Error("Forbidden");
}

function normalizeEntry(row: Record<string, unknown>): AluxKnowledgeEntry {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: (row.summary as string | null) ?? null,
    body: String(row.body ?? ""),
    category: (row.category as AluxKnowledgeCategory) ?? "otros",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    source_url: (row.source_url as string | null) ?? null,
    priority: Number(row.priority ?? 0),
    status: (row.status as AluxKnowledgeStatus) ?? "draft",
    embedded_at: (row.embedded_at as string | null) ?? null,
    embedding_model: (row.embedding_model as string | null) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

// ---------- Server fns (admin) ----------

export const listAluxKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const c = context.supabase as unknown as SbFrom;
    const res = await c
      .from("alux_knowledge_entries")
      .select(
        "id, slug, title, summary, body, category, tags, source_url, priority, status, embedded_at, embedding_model, updated_at",
      )
      .order!("updated_at", { ascending: false })
      .limit!(500);
    if (res.error) throw new Error(res.error.message);
    return ((res.data as Record<string, unknown>[]) ?? []).map(normalizeEntry);
  });

const UpsertInput = z.object({
  id: z.string().uuid().nullable().optional(),
  slug: z.string().max(96).optional(),
  title: z.string().min(4).max(200),
  summary: z.string().max(600).nullable().optional(),
  body: z.string().min(20).max(20_000),
  category: z.enum(ALUX_KNOWLEDGE_CATEGORIES),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  source_url: z.string().url().max(500).nullable().optional(),
  priority: z.number().int().min(0).max(100).default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const upsertAluxKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    // Sólo genera embedding cuando la entrada se publica; borradores no gastan tokens.
    let embedding: number[] | null = null;
    if (data.status === "published") {
      const composed = [data.title, data.summary ?? "", data.body, (data.tags ?? []).join(" ")]
        .filter(Boolean)
        .join("\n\n");
      embedding = await embedText(composed);
    }

    const slug = (data.slug && data.slug.trim()) || slugify(data.title);
    const rec: Record<string, unknown> = {
      slug,
      title: data.title,
      summary: data.summary ?? null,
      body: data.body,
      category: data.category,
      tags: data.tags ?? [],
      source_url: data.source_url ?? null,
      priority: data.priority ?? 0,
      status: data.status,
      updated_by: context.userId,
    };
    if (embedding) {
      rec.embedding = pgvectorLiteral(embedding);
      rec.embedding_model = EMBEDDING_MODEL;
      rec.embedded_at = new Date().toISOString();
    } else if (data.status !== "published") {
      // Al pasar a borrador/archivado limpiamos embedding para que no aparezca en retrieval.
      rec.embedding = null;
      rec.embedded_at = null;
      rec.embedding_model = null;
    }

    const c = context.supabase as unknown as SbFrom;
    let entryId: string;
    let finalSlug: string;
    if (data.id) {
      const upd = await c.from("alux_knowledge_entries").update(rec).eq("id", data.id);
      if (upd.error) throw new Error(upd.error.message);
      entryId = data.id;
      finalSlug = slug;
    } else {
      rec.created_by = context.userId;
      const ins = await c
        .from("alux_knowledge_entries")
        .insert(rec)
        .select("id, slug")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      const row = ins.data as { id: string; slug: string };
      entryId = row.id;
      finalSlug = row.slug;
    }

    // Sincronizar fila ES canónica en alux_knowledge_translations
    const tr = context.supabase as unknown as SbTrClient;
    const trPayload: Record<string, unknown> = {
      entry_id: entryId,
      locale: "es",
      title: data.title,
      summary: data.summary ?? null,
      body: data.body,
      tags: data.tags ?? [],
      source: "canonical",
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    if (embedding) {
      trPayload.embedding = pgvectorLiteral(embedding);
      trPayload.embedding_model = EMBEDDING_MODEL;
      trPayload.embedded_at = new Date().toISOString();
    } else if (data.status !== "published") {
      trPayload.embedding = null;
      trPayload.embedded_at = null;
      trPayload.embedding_model = null;
    }
    const trUp = await tr
      .from("alux_knowledge_translations")
      .upsert(trPayload, { onConflict: "entry_id,locale" });
    if (trUp.error) throw new Error(trUp.error.message);

    return { id: entryId, slug: finalSlug };
  });

const DeleteInput = z.object({ id: z.string().uuid() });

export const deleteAluxKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const c = context.supabase as unknown as SbFrom;
    const res = await c.from("alux_knowledge_entries").delete().eq("id", data.id);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

// ---------- Retrieval (usado por Alux en runtime) ----------

/**
 * Recupera las entradas más relevantes para una consulta libre.
 * Devuelve [] silenciosamente si no hay embedding key, si el gateway
 * falla o si no hay coincidencias — nunca rompe la generación de Alux.
 */
export async function retrieveAluxKnowledgeServer(
  supabase: unknown,
  query: string,
  opts: { matchCount?: number; matchThreshold?: number; locale?: string } = {},
): Promise<AluxKnowledgeMatch[]> {
  const q = (query ?? "").trim();
  if (q.length < 3) return [];
  const rawLocale = (opts.locale ?? "es").toLowerCase().slice(0, 2);
  const locale: AluxKbLocale = (ALUX_KB_LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as AluxKbLocale)
    : "es";
  try {
    const emb = await embedText(q);
    const rpc = supabase as RpcClient;
    const { data, error } = await rpc.rpc("match_alux_knowledge_i18n", {
      query_embedding: pgvectorLiteral(emb),
      target_locale: locale,
      match_count: opts.matchCount ?? 4,
      match_threshold: opts.matchThreshold ?? 0.55,
    });
    if (error) return [];
    const rows = (data as Record<string, unknown>[]) ?? [];
    return rows.map((r) => ({
      id: String(r.entry_id ?? r.id),
      slug: String(r.slug),
      title: String(r.title),
      summary: (r.summary as string | null) ?? null,
      body: String(r.body ?? ""),
      category: (r.category as AluxKnowledgeCategory) ?? "otros",
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      source_url: (r.source_url as string | null) ?? null,
      similarity: Number(r.similarity ?? 0),
      locale: (r.locale as AluxKbLocale) ?? locale,
      is_fallback: Boolean(r.is_fallback),
    }));
  } catch {
    return [];
  }
}

/** Compone un bloque markdown para inyectar como contexto extra al prompt. */
export function knowledgeToPromptBlock(
  matches: AluxKnowledgeMatch[],
  opts: { locale?: string } = {},
): string {
  if (!matches.length) return "";
  const rawLocale = (opts.locale ?? "es").toLowerCase().slice(0, 2);
  const target: AluxKbLocale = (ALUX_KB_LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as AluxKbLocale)
    : "es";
  const items = matches
    .map((m, i) => {
      const snippet = (m.summary ?? m.body).slice(0, 700).trim();
      const fallbackMark =
        m.is_fallback && target !== "es"
          ? ` [FUENTE_ES · TRADUCE AL ${LOCALE_NAMES[target].toUpperCase()}]`
          : "";
      return `${i + 1}. [${m.category}]${fallbackMark} ${m.title}\n${snippet}${m.source_url ? `\nFuente: ${m.source_url}` : ""}`;
    })
    .join("\n\n");
  const note =
    target !== "es"
      ? `\n\nNota: los fragmentos marcados [FUENTE_ES] están en español; tradúcelos con naturalidad al ${LOCALE_NAMES[target]} manteniendo nombres propios, direcciones y precios sin cambios.`
      : "";
  return `Base de conocimiento curada del Oriente Maya (usa estos hechos textualmente cuando apliquen; cita el título tal cual):\n\n${items}${note}`;
}

/** Retrieval expuesto para depurar / probar desde la consola admin. */
const SearchInput = z.object({ query: z.string().min(3).max(500) });
export const searchAluxKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    return retrieveAluxKnowledgeServer(context.supabase, data.query, {
      matchCount: 8,
      matchThreshold: 0.4,
    });
  });

// ---------- Ola A19 · Traducciones multilingües ----------

export interface AluxKnowledgeLocaleCoverage {
  entry_id: string;
  locale: AluxKbLocale;
  source: "canonical" | "human" | "ai_generated";
  embedded: boolean;
  reviewed_at: string | null;
  updated_at: string;
}

type SbTrClient = {
  from: (t: string) => {
    select: (s: string) => {
      order?: (c: string, o?: { ascending?: boolean }) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
      eq?: (a: string, b: unknown) => {
        eq?: (a: string, b: unknown) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
    upsert: (
      v: Record<string, unknown>,
      o?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export const listAluxKnowledgeLocaleCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AluxKnowledgeLocaleCoverage[]> => {
    await ensureAdmin(context.supabase, context.userId);
    const c = context.supabase as unknown as SbTrClient;
    const res = await c
      .from("alux_knowledge_translations")
      .select("entry_id, locale, source, embedded_at, reviewed_at, updated_at")
      .order!("updated_at", { ascending: false });
    if (res.error) throw new Error(res.error.message);
    return ((res.data as Record<string, unknown>[]) ?? []).map((r) => ({
      entry_id: String(r.entry_id),
      locale: r.locale as AluxKbLocale,
      source: (r.source as "canonical" | "human" | "ai_generated") ?? "ai_generated",
      embedded: Boolean(r.embedded_at),
      reviewed_at: (r.reviewed_at as string | null) ?? null,
      updated_at: String(r.updated_at ?? new Date().toISOString()),
    }));
  });

async function translateWithAi(input: {
  targetLocale: AluxKbLocale;
  title: string;
  summary: string | null;
  body: string;
  tags: string[];
}): Promise<{ title: string; summary: string | null; body: string; tags: string[] }> {
  const localeName = LOCALE_NAMES[input.targetLocale];
  const systemPrompt =
    "Eres traductor editorial turístico especializado en Yucatán y el Oriente Maya. " +
    "Traduces con naturalidad, tono cercano y profesional. " +
    "Mantén nombres propios (personas, cenotes, calles, hoteles, platillos), direcciones, precios y URLs sin cambios. " +
    "No añadas contenido nuevo. Devuelve estrictamente JSON válido con las llaves title, summary, body, tags.";
  const userPrompt = `Traduce este contenido al ${localeName} (código ${input.targetLocale}). Responde SOLO con JSON.\n\n` +
    JSON.stringify({
      title: input.title,
      summary: input.summary,
      body: input.body,
      tags: input.tags,
    });
  const res = await fetch(CHAT_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": requireApiKey(),
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Traducción gateway ${res.status}: ${msg.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content) as {
    title?: string;
    summary?: string | null;
    body?: string;
    tags?: string[];
  };
  if (!parsed.title || !parsed.body) throw new Error("Traducción inválida (title/body vacío)");
  return {
    title: String(parsed.title).slice(0, 400),
    summary: parsed.summary ? String(parsed.summary).slice(0, 1200) : null,
    body: String(parsed.body).slice(0, 24000),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 20) : input.tags,
  };
}

const TranslateInput = z.object({
  entryId: z.string().uuid(),
  locales: z.array(z.enum(ALUX_KB_LOCALES)).min(1),
  overwrite: z.boolean().optional().default(false),
});

export const translateAluxKnowledgeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TranslateInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const c = context.supabase as unknown as SbTrClient;

    // 1) Cargar fila canónica ES
    const sourceRes = await c
      .from("alux_knowledge_translations")
      .select!("title, summary, body, tags")
      .eq!("entry_id", data.entryId)
      .eq!("locale", "es")
      .maybeSingle();
    if (sourceRes.error) throw new Error(sourceRes.error.message);
    const source = sourceRes.data as
      | { title: string; summary: string | null; body: string; tags: string[] }
      | null;
    if (!source) throw new Error("Entrada sin versión ES canónica");

    const results: Array<{ locale: string; ok: boolean; error?: string }> = [];
    for (const locale of data.locales) {
      if (locale === "es") {
        results.push({ locale, ok: false, error: "ES ya es canónica" });
        continue;
      }
      try {
        // Skip si ya existe y no se pidió overwrite
        if (!data.overwrite) {
          const existing = await c
            .from("alux_knowledge_translations")
            .select!("id")
            .eq!("entry_id", data.entryId)
            .eq!("locale", locale)
            .maybeSingle();
          if (!existing.error && existing.data) {
            results.push({ locale, ok: false, error: "ya existe" });
            continue;
          }
        }
        const translated = await translateWithAi({
          targetLocale: locale,
          title: source.title,
          summary: source.summary,
          body: source.body,
          tags: source.tags,
        });
        const composed = [
          translated.title,
          translated.summary ?? "",
          translated.body,
          translated.tags.join(" "),
        ]
          .filter(Boolean)
          .join("\n\n");
        const embedding = await embedText(composed);
        const up = await c
          .from("alux_knowledge_translations")
          .upsert(
            {
              entry_id: data.entryId,
              locale,
              title: translated.title,
              summary: translated.summary,
              body: translated.body,
              tags: translated.tags,
              embedding: pgvectorLiteral(embedding),
              embedding_model: EMBEDDING_MODEL,
              embedded_at: new Date().toISOString(),
              source: "ai_generated",
              reviewed_at: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "entry_id,locale" },
          );
        if (up.error) throw new Error(up.error.message);
        results.push({ locale, ok: true });
      } catch (e) {
        results.push({ locale, ok: false, error: (e as Error).message });
      }
    }
    return { entryId: data.entryId, results };
  });

const MarkReviewedInput = z.object({
  entryId: z.string().uuid(),
  locale: z.enum(ALUX_KB_LOCALES),
});

export const markAluxTranslationReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MarkReviewedInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    type UpdChain = {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (
            a: string,
            b: unknown,
          ) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> };
        };
      };
    };
    const c = context.supabase as unknown as UpdChain;
    const res = await c
      .from("alux_knowledge_translations")
      .update({
        source: "human",
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("entry_id", data.entryId)
      .eq("locale", data.locale);
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });