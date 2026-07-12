-- Ola A2 · Alux Knowledge Base (RAG)
-- Base curada de conocimiento territorial y turístico que Alux consume vía embeddings.

CREATE EXTENSION IF NOT EXISTS vector;

-- Categorías controladas para poder filtrar y priorizar por dominio.
DO $$ BEGIN
  CREATE TYPE public.alux_knowledge_category AS ENUM (
    'cultura','historia','gastronomia','clima','transporte','seguridad',
    'costumbres','faq','experiencias','hospedaje','eventos','pueblos_magicos','otros'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alux_knowledge_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.alux_knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  body text NOT NULL,
  category public.alux_knowledge_category NOT NULL DEFAULT 'otros',
  tags text[] NOT NULL DEFAULT '{}',
  source_url text,
  priority int NOT NULL DEFAULT 0,
  status public.alux_knowledge_status NOT NULL DEFAULT 'draft',
  embedding vector(1536),
  embedding_model text,
  embedded_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alux_knowledge_entries TO authenticated;
GRANT ALL ON public.alux_knowledge_entries TO service_role;

ALTER TABLE public.alux_knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede leer entradas publicadas (Alux las consume en runtime).
CREATE POLICY "alux_knowledge_read_published"
  ON public.alux_knowledge_entries FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Admin / super_admin ven y editan todo.
CREATE POLICY "alux_knowledge_admin_all"
  ON public.alux_knowledge_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Índice HNSW para búsqueda por coseno (vector 1536 dims está dentro del cap).
CREATE INDEX IF NOT EXISTS alux_knowledge_embedding_idx
  ON public.alux_knowledge_entries USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS alux_knowledge_category_idx
  ON public.alux_knowledge_entries (category, status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.alux_knowledge_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS alux_knowledge_touch_tg ON public.alux_knowledge_entries;
CREATE TRIGGER alux_knowledge_touch_tg
  BEFORE UPDATE ON public.alux_knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.alux_knowledge_touch();

-- RPC de retrieval semántico. Solo devuelve publicadas y respeta RLS del caller.
CREATE OR REPLACE FUNCTION public.match_alux_knowledge(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  summary text,
  body text,
  category public.alux_knowledge_category,
  tags text[],
  source_url text,
  priority int,
  similarity float
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    k.id, k.slug, k.title, k.summary, k.body, k.category, k.tags, k.source_url, k.priority,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.alux_knowledge_entries k
  WHERE k.status = 'published'
    AND k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) >= match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 20));
$$;

GRANT EXECUTE ON FUNCTION public.match_alux_knowledge(vector, int, float) TO authenticated, service_role;