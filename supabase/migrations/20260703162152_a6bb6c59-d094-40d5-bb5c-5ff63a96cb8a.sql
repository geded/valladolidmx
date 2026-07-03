
-- Restauración de eb_block_comments (v1 Studio · US-03).
-- Fue eliminada erróneamente en la migración 3.3c anterior.

CREATE TABLE IF NOT EXISTS public.eb_block_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composition_id UUID NOT NULL REFERENCES public.page_compositions(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eb_block_comments_composition ON public.eb_block_comments(composition_id);
CREATE INDEX IF NOT EXISTS idx_eb_block_comments_block ON public.eb_block_comments(composition_id, block_id);
CREATE INDEX IF NOT EXISTS idx_eb_block_comments_open ON public.eb_block_comments(composition_id) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_block_comments TO authenticated;
GRANT ALL ON public.eb_block_comments TO service_role;

ALTER TABLE public.eb_block_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eb_comments_select_editors" ON public.eb_block_comments;
CREATE POLICY "eb_comments_select_editors"
  ON public.eb_block_comments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'editor')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "eb_comments_insert_editors" ON public.eb_block_comments;
CREATE POLICY "eb_comments_insert_editors"
  ON public.eb_block_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'editor')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

DROP POLICY IF EXISTS "eb_comments_update" ON public.eb_block_comments;
CREATE POLICY "eb_comments_update"
  ON public.eb_block_comments FOR UPDATE TO authenticated
  USING (
    (author_id = auth.uid() AND resolved_at IS NULL)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    (author_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "eb_comments_delete" ON public.eb_block_comments;
CREATE POLICY "eb_comments_delete"
  ON public.eb_block_comments FOR DELETE TO authenticated
  USING (
    (author_id = auth.uid() AND resolved_at IS NULL)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE OR REPLACE FUNCTION public.eb_block_comments_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_block_comments_touch ON public.eb_block_comments;
CREATE TRIGGER trg_eb_block_comments_touch
  BEFORE UPDATE ON public.eb_block_comments
  FOR EACH ROW EXECUTE FUNCTION public.eb_block_comments_touch();

CREATE OR REPLACE FUNCTION public.eb_comment_create(
  _composition_id UUID, _block_id TEXT, _body TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _new_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.has_role(_uid,'editor') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'forbidden: editor role required';
  END IF;
  INSERT INTO public.eb_block_comments (composition_id, block_id, author_id, body)
  VALUES (_composition_id, _block_id, _uid, _body)
  RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.eb_comment_resolve(_comment_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.has_role(_uid,'editor') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.eb_block_comments
     SET resolved_at = now(), resolved_by = _uid
   WHERE id = _comment_id AND resolved_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.eb_comment_reopen(_comment_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.has_role(_uid,'editor') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.eb_block_comments
     SET resolved_at = NULL, resolved_by = NULL
   WHERE id = _comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_comment_create(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.eb_comment_resolve(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.eb_comment_reopen(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.eb_comment_create(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_comment_resolve(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_comment_reopen(UUID) TO authenticated;

-- Notificación in-app al crear comentario (US-04).
CREATE OR REPLACE FUNCTION public.eb_notify_block_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _comp public.page_compositions%ROWTYPE;
  _recipient uuid;
  _payload jsonb;
BEGIN
  SELECT * INTO _comp FROM public.page_compositions WHERE id = NEW.composition_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  _payload := jsonb_build_object(
    'composition_id', NEW.composition_id,
    'slug', _comp.slug,
    'title', _comp.title,
    'block_id', NEW.block_id,
    'comment_id', NEW.id,
    'body_preview', LEFT(NEW.body, 240),
    'actor_id', NEW.author_id
  );

  FOR _recipient IN
    SELECT DISTINCT uid FROM (
      SELECT _comp.created_by AS uid
      UNION SELECT _comp.updated_by
      UNION SELECT author_id FROM public.eb_block_comments
        WHERE composition_id = NEW.composition_id AND block_id = NEW.block_id AND id <> NEW.id
    ) t WHERE uid IS NOT NULL
  LOOP
    IF _recipient IS DISTINCT FROM NEW.author_id THEN
      PERFORM public.unc_publish_in_app(
        'eb-cmt-' || NEW.id::text || '-' || _recipient::text,
        'eb.comment.created', _recipient, 'page:editors',
        'operational'::notification_category, _payload
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_notify_block_comment ON public.eb_block_comments;
CREATE TRIGGER trg_eb_notify_block_comment
AFTER INSERT ON public.eb_block_comments
FOR EACH ROW EXECUTE FUNCTION public.eb_notify_block_comment();
