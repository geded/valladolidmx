
-- Stage 15.10.2 · Experience Builder Studio v0
ALTER TYPE public.entity_kind ADD VALUE IF NOT EXISTS 'composition';
ALTER TYPE public.entity_kind ADD VALUE IF NOT EXISTS 'revision';

CREATE TABLE IF NOT EXISTS public.page_compositions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','internal_review')),
  page_type TEXT NOT NULL DEFAULT 'generic',
  current_draft JSONB NOT NULL DEFAULT jsonb_build_object('root', jsonb_build_object('children', '[]'::jsonb)),
  active_revision_id UUID,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_compositions TO authenticated;
GRANT ALL ON public.page_compositions TO service_role;

ALTER TABLE public.page_compositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eb_compositions_editorial_read" ON public.page_compositions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "eb_compositions_editorial_write" ON public.page_compositions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TABLE IF NOT EXISTS public.page_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  composition_id UUID NOT NULL REFERENCES public.page_compositions(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (composition_id, revision_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_revisions TO authenticated;
GRANT ALL ON public.page_revisions TO service_role;

ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eb_revisions_editorial_read" ON public.page_revisions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "eb_revisions_editorial_write" ON public.page_revisions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

ALTER TABLE public.page_compositions
  ADD CONSTRAINT page_compositions_active_revision_fk
  FOREIGN KEY (active_revision_id) REFERENCES public.page_revisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_page_revisions_comp ON public.page_revisions(composition_id, revision_number DESC);

CREATE OR REPLACE FUNCTION public.eb_touch_composition()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_touch_composition ON public.page_compositions;
CREATE TRIGGER trg_eb_touch_composition
  BEFORE UPDATE ON public.page_compositions
  FOR EACH ROW EXECUTE FUNCTION public.eb_touch_composition();

CREATE OR REPLACE FUNCTION public.eb_create_composition(
  _slug TEXT, _title TEXT, _description TEXT DEFAULT NULL, _page_type TEXT DEFAULT 'generic'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID; _uid UUID := auth.uid();
BEGIN
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden: requires admin or editor';
  END IF;
  INSERT INTO public.page_compositions(slug, title, description, page_type, created_by, updated_by)
  VALUES (_slug, _title, _description, COALESCE(_page_type, 'generic'), _uid, _uid)
  RETURNING id INTO _id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, to_status, actor_user_id, notes)
  VALUES ('composition', _id, 'Composition.Created', 'draft', _uid, _title);
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_create_composition(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_create_composition(TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_save_composition_draft(_id UUID, _tree JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.page_compositions SET current_draft = _tree, updated_by = _uid WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found'; END IF;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id)
  VALUES ('composition', _id, 'Composition.DraftSaved', _uid);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_save_composition_draft(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_save_composition_draft(UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_create_revision(_id UUID, _notes TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _rev_id UUID; _next INT; _draft JSONB;
BEGIN
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT current_draft INTO _draft FROM public.page_compositions WHERE id = _id;
  IF _draft IS NULL THEN RAISE EXCEPTION 'composition not found'; END IF;
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO _next FROM public.page_revisions WHERE composition_id = _id;
  INSERT INTO public.page_revisions(composition_id, revision_number, snapshot, notes, created_by)
  VALUES (_id, _next, _draft, _notes, _uid)
  RETURNING id INTO _rev_id;
  UPDATE public.page_compositions SET active_revision_id = _rev_id, updated_by = _uid WHERE id = _id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('revision', _rev_id, 'Composition.RevisionPublished', _uid, _notes);
  RETURN _rev_id;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_create_revision(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_create_revision(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_restore_revision(_id UUID, _revision_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _snap JSONB;
BEGIN
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT snapshot INTO _snap FROM public.page_revisions WHERE id = _revision_id AND composition_id = _id;
  IF _snap IS NULL THEN RAISE EXCEPTION 'revision not found for composition'; END IF;
  UPDATE public.page_compositions SET current_draft = _snap, updated_by = _uid WHERE id = _id;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('revision', _revision_id, 'Composition.RevisionRestored', _uid, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_restore_revision(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_restore_revision(UUID, UUID) TO authenticated;
