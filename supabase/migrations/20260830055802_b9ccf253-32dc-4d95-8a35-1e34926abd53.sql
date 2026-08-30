-- G8-R1-F1L · Paso 3: publicación de la Home premium consolidada como nueva revisión
DO $$
DECLARE
  v_comp uuid := '50d2f632-70bc-4c79-b569-a8a2885d8030';
  v_next int;
  v_rev uuid;
  v_draft jsonb;
BEGIN
  SELECT current_draft INTO v_draft FROM public.page_compositions WHERE id = v_comp;
  IF v_draft IS NULL OR v_draft->'root' IS NULL THEN
    RAISE EXCEPTION 'Draft de Home ausente; se aborta la promoción';
  END IF;

  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_next
  FROM public.page_revisions WHERE composition_id = v_comp;

  INSERT INTO public.page_revisions (composition_id, revision_number, snapshot, notes, snapshot_hash)
  VALUES (v_comp, v_next, v_draft, 'G8-R1-F1L · Home Premium G4 consolidada (paso 3 del runbook)',
          encode(digest(v_draft::text, 'sha256'), 'hex'))
  RETURNING id INTO v_rev;

  UPDATE public.page_compositions
     SET active_revision_id = v_rev,
         approved_revision_id = v_rev,
         approved_at = now(),
         status = 'published',
         published_at = now(),
         updated_at = now()
   WHERE id = v_comp;

  RAISE NOTICE 'Home promovida a revisión % (%).', v_next, v_rev;
END $$;