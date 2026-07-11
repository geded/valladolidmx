ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_verified_source_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_verified_source_check CHECK (verified_source IS NULL OR verified_source IN ('verified_purchase','managed_visit','verified_visit','verified_redemption','declared_visitor'));

CREATE OR REPLACE FUNCTION public.get_review_stats(_subject_kind text, _subject_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    'verifiedCount', COUNT(*) FILTER (WHERE verified_source IN ('verified_purchase','managed_visit','verified_visit','verified_redemption')),
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