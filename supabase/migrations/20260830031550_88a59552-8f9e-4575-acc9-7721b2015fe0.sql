DO $$
DECLARE
  _home uuid := '50d2f632-70bc-4c79-b569-a8a2885d8030';
  _premium uuid := '2038a3c8-be09-4d1c-8207-5e26a24e068c';
  _actor uuid := '065f93e4-4a39-4193-96b7-3f3a4012b841';
  _root jsonb;
  _draft jsonb;
  _hash text;
  _rev uuid;
  _n integer;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', _actor::text, 'role', 'authenticated')::text, true);

  -- 1) Neutralizar la competencia por page_type='home'.
  UPDATE public.page_compositions
     SET page_type = 'custom', updated_by = _actor, updated_at = now()
   WHERE id = _premium AND status = 'draft';

  -- 2) Tomar los 12 bloques premium y limpiar el hero de medios de evaluación.
  SELECT jsonb_set(
           c.current_draft->'root',
           '{children}',
           (SELECT jsonb_agg(
                     CASE WHEN e.value->>'id' = 'g8_01'
                          THEN jsonb_set(e.value, '{config,background_images}', '[]'::jsonb)
                          ELSE e.value END
                     ORDER BY e.ord)
              FROM jsonb_array_elements(c.current_draft->'root'->'children')
                   WITH ORDINALITY e(value, ord))
         )
    INTO _root
    FROM public.page_compositions c
   WHERE c.id = _premium;

  IF _root IS NULL OR jsonb_array_length(_root->'children') <> 12 THEN
    RAISE EXCEPTION 'premium_root_invalid';
  END IF;

  -- 3) Copiar al borrador de Home preservando chrome/SEO existentes.
  UPDATE public.page_compositions
     SET current_draft = jsonb_set(current_draft, '{root}', _root),
         draft_author_id = _actor,
         updated_by = _actor,
         updated_at = now()
   WHERE id = _home
  RETURNING current_draft INTO _draft;

  -- 4) Snapshot aprobado (revisión 31) con el hash oficial del workflow.
  _hash := public.eb_i4_snapshot_hash(_draft);
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO _n
    FROM public.page_revisions WHERE composition_id = _home;

  INSERT INTO public.page_revisions(
    composition_id, revision_number, snapshot, snapshot_hash, notes, created_by
  ) VALUES (_home, _n, _draft, _hash, 'G8 · Home Premium', _actor)
  RETURNING id INTO _rev;

  UPDATE public.page_compositions
     SET workflow_state = 'approved',
         workflow_updated_at = now(),
         workflow_updated_by = _actor,
         workflow_notes = 'G8 · Home Premium',
         approved_revision_id = _rev,
         approved_snapshot_hash = _hash,
         approved_by = _actor,
         approved_at = now()
   WHERE id = _home;

  -- 5) Publicación por el RPC oficial (swap de active_revision_id + auditoría).
  PERFORM public.eb_publish_composition(_home, 'G8 · Home Premium');
END $$;