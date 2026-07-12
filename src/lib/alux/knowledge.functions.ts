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
    if (data.id) {
      const upd = await c.from("alux_knowledge_entries").update(rec).eq("id", data.id);
      if (upd.error) throw new Error(upd.error.message);
      return { id: data.id, slug };
    }
    rec.created_by = context.userId;
    const ins = await c
      .from("alux_knowledge_entries")
      .insert(rec)
      .select("id, slug")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const row = ins.data as { id: string; slug: string };
    return { id: row.id, slug: row.slug };
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
  opts: { matchCount?: number; matchThreshold?: number } = {},
): Promise<AluxKnowledgeMatch[]> {
  const q = (query ?? "").trim();
  if (q.length < 3) return [];
  try {
    const emb = await embedText(q);
    const rpc = supabase as RpcClient;
    const { data, error } = await rpc.rpc("match_alux_knowledge", {
      query_embedding: pgvectorLiteral(emb),
      match_count: opts.matchCount ?? 4,
      match_threshold: opts.matchThreshold ?? 0.55,
    });
    if (error) return [];
    const rows = (data as Record<string, unknown>[]) ?? [];
    return rows.map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      title: String(r.title),
      summary: (r.summary as string | null) ?? null,
      body: String(r.body ?? ""),
      category: (r.category as AluxKnowledgeCategory) ?? "otros",
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      source_url: (r.source_url as string | null) ?? null,
      similarity: Number(r.similarity ?? 0),
    }));
  } catch {
    return [];
  }
}

/** Compone un bloque markdown para inyectar como contexto extra al prompt. */
export function knowledgeToPromptBlock(matches: AluxKnowledgeMatch[]): string {
  if (!matches.length) return "";
  const items = matches
    .map((m, i) => {
      const snippet = (m.summary ?? m.body).slice(0, 700).trim();
      return `${i + 1}. [${m.category}] ${m.title}\n${snippet}${m.source_url ? `\nFuente: ${m.source_url}` : ""}`;
    })
    .join("\n\n");
  return `Base de conocimiento curada del Oriente Maya (usa estos hechos textualmente cuando apliquen; cita el título tal cual):\n\n${items}`;
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