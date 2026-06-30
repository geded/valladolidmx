
-- ============================================================
-- Stage 15.10.3 · Public Home Migration to Experience Builder
-- ============================================================

-- 1) Extender estados de page_compositions a 'published'
ALTER TABLE public.page_compositions
  DROP CONSTRAINT IF EXISTS page_compositions_status_check;

ALTER TABLE public.page_compositions
  ADD CONSTRAINT page_compositions_status_check
  CHECK (status IN ('draft','internal_review','published'));

ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS variant_key TEXT NOT NULL DEFAULT 'default';

COMMENT ON COLUMN public.page_compositions.variant_key IS
  'Preparación arquitectónica para Composition Variants (15.10.3+). '
  'Aún no se utiliza para selección pública; por ahora siempre es ''default''.';

-- 2) Garantizar una sola composición publicada por (page_type, variant_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_compositions_unique_published
  ON public.page_compositions(page_type, variant_key)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_page_compositions_status_page_type
  ON public.page_compositions(status, page_type);

-- 3) RPC: publicar composición (solo admin)
CREATE OR REPLACE FUNCTION public.eb_publish_composition(
  _id UUID,
  _notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _rev_id UUID;
  _next INT;
  _draft JSONB;
  _page_type TEXT;
  _variant TEXT;
BEGIN
  IF NOT public.has_role(_uid, 'admin') THEN
    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
    VALUES ('composition', _id, 'Composition.PublishRejected', _uid, 'requires admin');
    RAISE EXCEPTION 'forbidden: only admins can publish compositions';
  END IF;

  SELECT current_draft, page_type, COALESCE(variant_key, 'default')
    INTO _draft, _page_type, _variant
  FROM public.page_compositions WHERE id = _id;
  IF _draft IS NULL THEN
    RAISE EXCEPTION 'composition not found';
  END IF;

  -- Crear revisión inmutable a partir del borrador actual
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO _next
  FROM public.page_revisions WHERE composition_id = _id;

  INSERT INTO public.page_revisions(composition_id, revision_number, snapshot, notes, created_by)
  VALUES (_id, _next, _draft, _notes, _uid)
  RETURNING id INTO _rev_id;

  -- Despublicar cualquier composición previa con el mismo (page_type, variant_key)
  UPDATE public.page_compositions
    SET status = 'draft',
        published_at = NULL,
        published_by = NULL,
        updated_by = _uid
  WHERE status = 'published'
    AND page_type = _page_type
    AND COALESCE(variant_key, 'default') = _variant
    AND id <> _id;

  UPDATE public.page_compositions
    SET status = 'published',
        active_revision_id = _rev_id,
        published_at = now(),
        published_by = _uid,
        updated_by = _uid
  WHERE id = _id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, to_status, actor_user_id, notes)
  VALUES ('composition', _id, 'Composition.Published', 'published', _uid, _notes);

  RETURN _rev_id;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_publish_composition(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_publish_composition(UUID, TEXT) TO authenticated;

-- 4) RPC: despublicar composición (solo admin)
CREATE OR REPLACE FUNCTION public.eb_unpublish_composition(
  _id UUID,
  _notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'admin') THEN
    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
    VALUES ('composition', _id, 'Composition.PublishRejected', _uid, 'requires admin (unpublish)');
    RAISE EXCEPTION 'forbidden: only admins can unpublish compositions';
  END IF;

  UPDATE public.page_compositions
    SET status = 'draft',
        published_at = NULL,
        published_by = NULL,
        updated_by = _uid
  WHERE id = _id AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'composition is not currently published';
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, to_status, actor_user_id, notes)
  VALUES ('composition', _id, 'Composition.Unpublished', 'draft', _uid, _notes);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_unpublish_composition(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_unpublish_composition(UUID, TEXT) TO authenticated;

-- 5) RPC pública: leer la Home publicada (read-only, sin sesión)
--    SECURITY DEFINER para sortear RLS, pero devuelve únicamente
--    composiciones cuyo status = 'published' y page_type = 'home'.
CREATE OR REPLACE FUNCTION public.eb_get_published_home(
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
    c.id,
    c.slug,
    c.title,
    c.description,
    c.page_type,
    COALESCE(c.variant_key, 'default') AS variant_key,
    r.snapshot,
    r.id AS revision_id,
    r.revision_number,
    c.published_at
  FROM public.page_compositions c
  JOIN public.page_revisions r ON r.id = c.active_revision_id
  WHERE c.status = 'published'
    AND c.page_type = 'home'
    AND COALESCE(c.variant_key, 'default') = COALESCE(_variant_key, 'default')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.eb_get_published_home(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_get_published_home(TEXT) TO anon, authenticated;
