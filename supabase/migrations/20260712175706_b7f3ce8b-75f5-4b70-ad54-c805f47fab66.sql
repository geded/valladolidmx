
-- ============================================================
-- Ola A19 · KB Multilingüe (Opción B)
-- ============================================================

-- 1) Tabla de traducciones
CREATE TABLE IF NOT EXISTS public.alux_knowledge_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.alux_knowledge_entries(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('es','en','fr','de','it','pt')),
  title text NOT NULL,
  summary text,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  embedding vector(1536),
  embedding_model text,
  embedded_at timestamptz,
  source text NOT NULL DEFAULT 'ai_generated' CHECK (source IN ('canonical','human','ai_generated')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entry_id, locale)
);

-- 2) GRANTs (antes de RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alux_knowledge_translations TO authenticated;
GRANT SELECT ON public.alux_knowledge_translations TO anon;
GRANT ALL ON public.alux_knowledge_translations TO service_role;

-- 3) RLS
ALTER TABLE public.alux_knowledge_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alux_kb_tr_admin_all" ON public.alux_knowledge_translations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Read published translations (join to entry status)
CREATE POLICY "alux_kb_tr_read_published" ON public.alux_knowledge_translations
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.alux_knowledge_entries e
      WHERE e.id = alux_knowledge_translations.entry_id
        AND e.status = 'published'
    )
  );

-- 4) Índices
CREATE INDEX IF NOT EXISTS alux_kb_tr_entry_locale_idx
  ON public.alux_knowledge_translations(entry_id, locale);
CREATE INDEX IF NOT EXISTS alux_kb_tr_embedding_idx
  ON public.alux_knowledge_translations USING hnsw (embedding vector_cosine_ops);

-- 5) Trigger updated_at
CREATE OR REPLACE FUNCTION public.alux_kb_tr_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS alux_kb_tr_touch_tg ON public.alux_knowledge_translations;
CREATE TRIGGER alux_kb_tr_touch_tg
  BEFORE UPDATE ON public.alux_knowledge_translations
  FOR EACH ROW EXECUTE FUNCTION public.alux_kb_tr_touch();

-- 6) Backfill: copiar entradas existentes como fila ES canónica
INSERT INTO public.alux_knowledge_translations
  (entry_id, locale, title, summary, body, tags, embedding, embedding_model, embedded_at, source, reviewed_at)
SELECT
  e.id, 'es', e.title, e.summary, e.body, e.tags, e.embedding, e.embedding_model, e.embedded_at,
  'canonical', now()
FROM public.alux_knowledge_entries e
ON CONFLICT (entry_id, locale) DO NOTHING;

-- 7) RPC nuevo: match con locale + fallback ES
CREATE OR REPLACE FUNCTION public.match_alux_knowledge_i18n(
  query_embedding vector(1536),
  target_locale text DEFAULT 'es',
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  entry_id uuid,
  slug text,
  title text,
  summary text,
  body text,
  category alux_knowledge_category,
  tags text[],
  source_url text,
  locale text,
  is_fallback boolean,
  similarity float
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH primary_hits AS (
    SELECT
      t.id, t.entry_id, e.slug, t.title, t.summary, t.body,
      e.category, t.tags, e.source_url, t.locale,
      false AS is_fallback,
      1 - (t.embedding <=> query_embedding) AS similarity
    FROM public.alux_knowledge_translations t
    JOIN public.alux_knowledge_entries e ON e.id = t.entry_id
    WHERE t.locale = target_locale
      AND e.status = 'published'
      AND t.embedding IS NOT NULL
      AND (1 - (t.embedding <=> query_embedding)) >= match_threshold
    ORDER BY t.embedding <=> query_embedding
    LIMIT match_count
  ),
  fallback_hits AS (
    SELECT
      t.id, t.entry_id, e.slug, t.title, t.summary, t.body,
      e.category, t.tags, e.source_url, t.locale,
      true AS is_fallback,
      1 - (t.embedding <=> query_embedding) AS similarity
    FROM public.alux_knowledge_translations t
    JOIN public.alux_knowledge_entries e ON e.id = t.entry_id
    WHERE t.locale = 'es'
      AND target_locale <> 'es'
      AND e.status = 'published'
      AND t.embedding IS NOT NULL
      AND (1 - (t.embedding <=> query_embedding)) >= match_threshold
      AND t.entry_id NOT IN (SELECT p.entry_id FROM primary_hits p)
    ORDER BY t.embedding <=> query_embedding
    LIMIT GREATEST(match_count - (SELECT count(*) FROM primary_hits), 0)
  )
  SELECT * FROM primary_hits
  UNION ALL
  SELECT * FROM fallback_hits
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_alux_knowledge_i18n(vector, text, int, float) TO authenticated, anon, service_role;
