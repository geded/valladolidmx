
-- Trust Engine v1 · US-G.2 — columnas anti-abuso + RPC agregado

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS verified_source text
    CHECK (verified_source IS NULL OR verified_source IN
      ('verified_purchase','managed_visit','verified_visit','declared_visitor')),
  ADD COLUMN IF NOT EXISTS visit_date date,
  ADD COLUMN IF NOT EXISTS visit_type text,
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS business_response text,
  ADD COLUMN IF NOT EXISTS business_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_response_by uuid,
  ADD COLUMN IF NOT EXISTS helpful_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS reviews_public_lookup_idx
  ON public.reviews (subject_kind, subject_id, status, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_review_stats(
  _subject_kind text,
  _subject_id uuid
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH src AS (
    SELECT rating, verified_source
    FROM public.reviews
    WHERE subject_kind::text = _subject_kind
      AND subject_id = _subject_id
      AND status = 'published'
      AND deleted_at IS NULL
  )
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'average', COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    'verifiedCount', COUNT(*) FILTER (
      WHERE verified_source IN ('verified_purchase','managed_visit','verified_visit')
    ),
    'distribution', jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    )
  )
  FROM src;
$$;

GRANT EXECUTE ON FUNCTION public.get_review_stats(text, uuid) TO anon, authenticated;
