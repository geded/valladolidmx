/**
 * H3·A3 · Media Intelligence Pipeline (Fase 1 · Semántica).
 *
 * Server functions oficiales del pipeline:
 *  - suggestMediaAlt      — la IA propone (nunca commit al ALT humano).
 *  - saveMediaMetadata    — el usuario decide (ALT/título/descripción/entidad/contexto).
 *  - listMediaTranslations — lecturas por idioma para el CMS.
 *  - upsertMediaTranslation — el usuario decide por idioma.
 *
 * Reglas invariantes:
 *  - IA propone → columnas *_ai. Usuario decide → columnas canónicas.
 *  - Nunca sobrescribimos alt_text si `alt_text_source = 'human'`.
 *  - Multilenguaje por diseño: idioma primario en `media_assets`,
 *    variantes en `media_asset_translations`.
 *  - `intelligence` jsonb versionado guarda modelo, prompt version,
 *    timestamps y confidence para trazabilidad futura.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROMPT_VERSION = "vmx.media-alt.v1";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const SUPPORTED_LOCALES = ["es", "en", "fr", "de", "it", "pt"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed: ${error.message}`);
  if (!data) throw new Error("forbidden");
}

/* ─────────────────────────  suggestMediaAlt  ───────────────────────── */

const SuggestInput = z.object({
  mediaId: z.string().uuid(),
  locale: z.enum(SUPPORTED_LOCALES).default("es"),
  usageContext: z.string().max(80).optional(),
  entityHint: z.string().max(160).optional(),
});

export const suggestMediaAlt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SuggestInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    const { data: media, error } = await context.supabase
      .from("media_assets")
      .select(
        "id, storage_bucket, storage_path, mime_type, alt_text, alt_text_source, title, description, entity_kind, entity_id, usage_context",
      )
      .eq("id", data.mediaId)
      .maybeSingle();
    if (error) throw error;
    if (!media) throw new Error("media_not_found");

    // Nunca degradamos manual: si ya hay ALT humano en el idioma primario y locale=es,
    // devolvemos el existente sin llamar a la IA.
    if (media.alt_text_source === "human" && data.locale === "es") {
      return {
        ok: true,
        skipped: true,
        reason: "manual_alt_preserved",
        current: media.alt_text,
      };
    }

    // Firmar URL temporal (bucket privado o público, la firma funciona en ambos).
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (supabaseAdmin as any).storage;
    const { data: signed, error: signErr } = await storage
      .from(media.storage_bucket)
      .createSignedUrl(media.storage_path, 300);
    if (signErr || !signed?.signedUrl) {
      throw new Error(`signed_url_failed: ${signErr?.message ?? "unknown"}`);
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("missing_lovable_api_key");

    const system = buildSystemPrompt(data.locale);
    const userHint = buildUserPrompt({
      locale: data.locale,
      usageContext: data.usageContext ?? media.usage_context ?? null,
      entityKind: media.entity_kind ?? null,
      entityHint: data.entityHint ?? null,
    });

    const started = Date.now();
    // Directo al gateway (OpenAI-compatible) para simplicidad y control del
    // mensaje multimodal — patrón coherente con el resto de server fns Alux.
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userHint },
              { type: "image_url", image_url: { url: signed.signedUrl } },
            ],
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ai_gateway_error[${res.status}]: ${body.slice(0, 400)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) throw new Error("ai_empty_response");

    const parsed = safeParseProposal(raw);
    const latencyMs = Date.now() - started;

    const intelligencePatch = {
      last_ai_run: {
        at: new Date().toISOString(),
        model: DEFAULT_MODEL,
        prompt_version: PROMPT_VERSION,
        latency_ms: latencyMs,
        locale: data.locale,
        confidence: parsed.confidence,
      },
    };

    if (data.locale === "es") {
      // Idioma primario → columnas de media_assets.*_ai
      const nextIntelligence = mergeIntelligence(
        (media as unknown as { intelligence?: Record<string, unknown> }).intelligence,
        intelligencePatch,
      );
      const { error: upErr } = await context.supabase
        .from("media_assets")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          alt_text_ai: parsed.alt,
          alt_text_source:
            media.alt_text_source === "human" ? "human" : "ai_pending",
          review_state:
            media.alt_text_source === "human" ? "approved" : "ai_suggested",
          intelligence: nextIntelligence as unknown as never,
        } as never)
        .eq("id", data.mediaId);
      if (upErr) throw upErr;
    } else {
      // Idiomas secundarios → tabla de traducciones
      const { error: tErr } = await context.supabase
        .from("media_asset_translations")
        .upsert(
          {
            media_id: data.mediaId,
            locale: data.locale,
            alt_text_ai: parsed.alt,
            title: parsed.title ?? null,
            caption: parsed.caption ?? null,
            description: parsed.description ?? null,
            source: "ai_pending",
            review_state: "ai_suggested",
            intelligence: intelligencePatch as unknown as never,
            updated_by: context.userId,
          } as never,
          { onConflict: "media_id,locale" },
        );
      if (tErr) throw tErr;
    }

    return {
      ok: true,
      skipped: false,
      locale: data.locale,
      proposal: parsed,
      model: DEFAULT_MODEL,
      promptVersion: PROMPT_VERSION,
      latencyMs,
    };
  });

/* ─────────────────────────  saveMediaMetadata  ─────────────────────── */

const SaveInput = z.object({
  mediaId: z.string().uuid(),
  alt_text: z.string().max(500).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  caption: z.string().max(400).nullable().optional(),
  entity_kind: z.string().max(40).nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  usage_context: z.string().max(80).nullable().optional(),
  locale: z.enum(SUPPORTED_LOCALES).default("es"),
  // Marca origen. Por defecto asumimos revisión humana al guardar desde CMS.
  source: z.enum(["human", "ai"]).default("human"),
});

export const saveMediaMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    if (data.locale === "es") {
      const patch: Record<string, unknown> = {
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      };
      if (data.alt_text !== undefined) {
        patch.alt_text = data.alt_text;
        patch.alt_text_source = data.source;
        patch.review_state =
          data.source === "human" ? "approved" : "ai_suggested";
      }
      if (data.title !== undefined) patch.title = data.title;
      if (data.description !== undefined) patch.description = data.description;
      if (data.caption !== undefined) patch.caption = data.caption;
      if (data.entity_kind !== undefined) patch.entity_kind = data.entity_kind;
      if (data.entity_id !== undefined) patch.entity_id = data.entity_id;
      if (data.usage_context !== undefined)
        patch.usage_context = data.usage_context;

      const { error } = await context.supabase
        .from("media_assets")
        .update(patch as never)
        .eq("id", data.mediaId);
      if (error) throw error;
      return { ok: true };
    }

    // Locale secundario → traducción
    const patch: Record<string, unknown> = {
      media_id: data.mediaId,
      locale: data.locale,
      source: data.source,
      review_state: data.source === "human" ? "approved" : "ai_suggested",
      updated_by: context.userId,
    };
    if (data.alt_text !== undefined) patch.alt_text = data.alt_text;
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.caption !== undefined) patch.caption = data.caption;

    const { error } = await context.supabase
      .from("media_asset_translations")
      .upsert(patch as never, { onConflict: "media_id,locale" });
    if (error) throw error;
    return { ok: true };
  });

/* ─────────────────────────  listMediaTranslations  ─────────────────── */

const ListTranslationsInput = z.object({
  mediaId: z.string().uuid(),
});

export const listMediaTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListTranslationsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { data: rows, error } = await context.supabase
      .from("media_asset_translations")
      .select(
        "id, locale, alt_text, alt_text_ai, title, caption, description, source, review_state, updated_at",
      )
      .eq("media_id", data.mediaId)
      .order("locale");
    if (error) throw error;
    return { rows: rows ?? [] };
  });

/* ─────────────────────  suggestMediaAltBatch  ──────────────────────
 * Lote controlado: procesa ≤ 25 media/llamada, con concurrencia 3
 * y locales explícitos. IA nunca sobrescribe humano (delegado al
 * trigger `media_alt_protect_human` + a `suggestMediaAlt`).
 */

const BatchInput = z.object({
  mediaIds: z.array(z.string().uuid()).min(1).max(25),
  locales: z.array(z.enum(SUPPORTED_LOCALES)).min(1).max(6),
});

export const suggestMediaAltBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BatchInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    const tasks: Array<{ mediaId: string; locale: Locale }> = [];
    for (const id of data.mediaIds) {
      for (const loc of data.locales) tasks.push({ mediaId: id, locale: loc });
    }

    const CONCURRENCY = 3;
    const results: Array<{
      mediaId: string;
      locale: Locale;
      ok: boolean;
      skipped?: boolean;
      error?: string;
    }> = [];
    let cursor = 0;
    async function worker() {
      while (cursor < tasks.length) {
        const idx = cursor++;
        const t = tasks[idx]!;
        try {
          const r = await suggestMediaAlt({
            data: { mediaId: t.mediaId, locale: t.locale },
          });
          results.push({ mediaId: t.mediaId, locale: t.locale, ok: true, skipped: r.skipped });
        } catch (err) {
          results.push({
            mediaId: t.mediaId,
            locale: t.locale,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker),
    );

    const ok = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.ok).length;
    return { total: tasks.length, ok, skipped, failed, results };
  });

/* ─────────────────────  approveMediaTranslation  ────────────────── */

const ApproveInput = z.object({
  mediaId: z.string().uuid(),
  locale: z.enum(SUPPORTED_LOCALES),
  altText: z.string().min(1).max(500).optional(),
});

/**
 * Aprueba una propuesta IA (idioma primario o traducción). Si
 * `altText` viene, marca la aprobación como edición humana.
 */
export const approveMediaTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);

    if (data.locale === "es") {
      const { data: media } = await context.supabase
        .from("media_assets")
        .select("alt_text_ai")
        .eq("id", data.mediaId)
        .maybeSingle();
      const finalAlt = data.altText ?? (media?.alt_text_ai ?? null);
      if (!finalAlt) throw new Error("nothing_to_approve");
      const { error } = await context.supabase
        .from("media_assets")
        .update({
          alt_text: finalAlt,
          alt_text_source: data.altText ? "human" : "ai",
          review_state: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: context.userId,
        } as never)
        .eq("id", data.mediaId);
      if (error) throw error;
      return { ok: true };
    }

    // Traducción
    const { data: t } = await context.supabase
      .from("media_asset_translations")
      .select("alt_text_ai")
      .eq("media_id", data.mediaId)
      .eq("locale", data.locale)
      .maybeSingle();
    const finalAlt = data.altText ?? (t?.alt_text_ai ?? null);
    if (!finalAlt) throw new Error("nothing_to_approve");
    const { error } = await context.supabase
      .from("media_asset_translations")
      .upsert(
        {
          media_id: data.mediaId,
          locale: data.locale,
          alt_text: finalAlt,
          source: data.altText ? "human" : "ai",
          review_state: "approved",
          updated_by: context.userId,
        } as never,
        { onConflict: "media_id,locale" },
      );
    if (error) throw error;
    return { ok: true };
  });

/* ─────────────────────────  helpers  ──────────────────────────────── */

function buildSystemPrompt(locale: Locale): string {
  const lang = LOCALE_NAME[locale];
  return [
    `Eres un curador de contenido turístico para Valladolid, Yucatán y el Oriente Maya.`,
    `Generas texto alternativo (ALT) SEO y accesibilidad para imágenes que verán viajeros reales.`,
    `Idioma de salida: ${lang} (${locale}). Nunca mezcles idiomas.`,
    `Reglas:`,
    `- ALT descriptivo (máx 140 caracteres), sin "imagen de" ni "foto de".`,
    `- Título breve (máx 60 caracteres).`,
    `- Caption opcional (máx 160 caracteres) con contexto turístico.`,
    `- Descripción larga opcional (máx 400 caracteres) para SEO editorial.`,
    `- Confidence numérica 0..1 según cuán claro es el sujeto de la foto.`,
    `- Si la imagen es abstracta o irrelevante, devuelve confidence baja y ALT genérico honesto.`,
    `Responde SIEMPRE con JSON válido con las claves: alt, title, caption, description, confidence.`,
  ].join("\n");
}

function buildUserPrompt(input: {
  locale: Locale;
  usageContext: string | null;
  entityKind: string | null;
  entityHint: string | null;
}): string {
  const bits: string[] = [];
  if (input.entityKind) bits.push(`Entidad: ${input.entityKind}`);
  if (input.entityHint) bits.push(`Contexto: ${input.entityHint}`);
  if (input.usageContext) bits.push(`Uso: ${input.usageContext}`);
  const ctx = bits.length ? `\n\n${bits.join(" · ")}` : "";
  return `Describe esta imagen para uso turístico oficial en ${LOCALE_NAME[input.locale]}.${ctx}\n\nDevuelve JSON.`;
}

const LOCALE_NAME: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

type Proposal = {
  alt: string;
  title: string | null;
  caption: string | null;
  description: string | null;
  confidence: number;
};

function safeParseProposal(raw: string): Proposal {
  // Extraer JSON aunque venga con ```json fences.
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const j = JSON.parse(cleaned);
    return {
      alt: String(j.alt ?? "").slice(0, 140),
      title: j.title ? String(j.title).slice(0, 60) : null,
      caption: j.caption ? String(j.caption).slice(0, 160) : null,
      description: j.description ? String(j.description).slice(0, 400) : null,
      confidence:
        typeof j.confidence === "number"
          ? Math.max(0, Math.min(1, j.confidence))
          : 0.5,
    };
  } catch {
    // Fallback honesto: usa el texto crudo como ALT y confidence baja.
    return {
      alt: cleaned.slice(0, 140),
      title: null,
      caption: null,
      description: null,
      confidence: 0.2,
    };
  }
}

function mergeIntelligence(
  prev: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(prev ?? {}), ...patch };
}