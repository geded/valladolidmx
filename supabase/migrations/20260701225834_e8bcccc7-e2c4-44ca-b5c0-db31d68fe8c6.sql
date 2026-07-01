DO $$
DECLARE
  _new UUID;
  _old UUID;
  _rev UUID;
  _tree JSONB;
BEGIN
  SELECT id, current_draft INTO _new, _tree FROM public.page_compositions WHERE slug='home' LIMIT 1;
  SELECT id INTO _old FROM public.page_compositions WHERE page_type='home' AND status='published' AND id <> _new LIMIT 1;

  IF _old IS NOT NULL THEN
    UPDATE public.page_compositions SET status='draft', published_at=NULL, active_revision_id=active_revision_id WHERE id=_old;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.page_revisions WHERE composition_id=_new) THEN
    INSERT INTO public.page_revisions(composition_id, revision_number, snapshot, notes)
    VALUES (_new, 1, _tree, 'Seed US-01 publicado')
    RETURNING id INTO _rev;
  ELSE
    SELECT id INTO _rev FROM public.page_revisions WHERE composition_id=_new ORDER BY revision_number DESC LIMIT 1;
  END IF;

  UPDATE public.page_compositions
     SET status='published', active_revision_id=_rev, published_at=now()
   WHERE id=_new;
END $$;