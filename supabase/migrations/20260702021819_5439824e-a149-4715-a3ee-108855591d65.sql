CREATE OR REPLACE FUNCTION public.eb_get_published_by_slug(
  _slug TEXT,
  _variant_key TEXT DEFAULT 'default'
) RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  description TEXT,
  page_type TEXT,
  variant_key TEXT,
  snapshot JSONB,
  revision_id UUID,
  revision_number INT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.id, c.slug, c.title, c.description, c.page_type,
    COALESCE(c.variant_key, 'default') AS variant_key,
    r.snapshot, r.id AS revision_id, r.revision_number, c.published_at
  FROM public.page_compositions c
  JOIN public.page_revisions r ON r.id = c.active_revision_id
  WHERE c.status = 'published'
    AND c.slug = _slug
    AND COALESCE(c.variant_key, 'default') = COALESCE(_variant_key, 'default')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.eb_get_published_by_slug(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_get_published_by_slug(TEXT, TEXT) TO anon, authenticated;