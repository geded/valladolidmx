CREATE OR REPLACE FUNCTION public.eb_save_composition_draft(_id uuid, _tree jsonb, _expected_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _previous_state text;
  _previous_hash text;
  _next_hash text;
  _next_version bigint;
BEGIN
  -- Un autoguardado nunca debe esperar hasta agotar el tiempo de la petición.
  PERFORM set_config('lock_timeout', '1500ms', true);

  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _tree IS NULL OR jsonb_typeof(_tree) <> 'object' THEN
    RAISE EXCEPTION 'invalid_composition_tree' USING ERRCODE = '22023';
  END IF;

  BEGIN
    SELECT workflow_state, COALESCE(draft_hash, public.eb_i4_snapshot_hash(current_draft))
      INTO _previous_state, _previous_hash
    FROM public.page_compositions
    WHERE id = _id
    FOR UPDATE;
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'draft_busy' USING ERRCODE = '55P03';
  END;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002';
  END IF;

  IF _expected_hash IS NULL OR _expected_hash <> _previous_hash THEN
    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
    VALUES ('composition', _id, 'Composition.DraftSaveConflict', _uid,
      jsonb_build_object('expected_hash', _expected_hash, 'actual_hash', _previous_hash, 'result', 'rejected', 'reason', 'draft_changed'));
    RAISE EXCEPTION 'draft_conflict' USING ERRCODE = '40001';
  END IF;

  _next_hash := public.eb_i4_snapshot_hash(_tree);
  UPDATE public.page_compositions
     SET current_draft = _tree,
         draft_version = draft_version + 1,
         draft_hash = _next_hash,
         draft_author_id = _uid,
         workflow_state = 'draft',
         workflow_updated_at = now(),
         workflow_updated_by = _uid,
         workflow_notes = NULL,
         approved_revision_id = NULL,
         approved_snapshot_hash = NULL,
         approved_by = NULL,
         approved_at = NULL,
         scheduled_publish_at = NULL,
         scheduled_publish_by = NULL,
         scheduled_publish_notes = NULL,
         scheduled_revision_id = NULL,
         scheduled_snapshot_hash = NULL,
         updated_by = _uid
   WHERE id = _id
   RETURNING draft_version INTO _next_version;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('composition', _id, 'Composition.DraftSaved', _uid,
    jsonb_build_object(
      'previous_workflow_state', _previous_state,
      'approval_invalidated', _previous_state IN ('approved','scheduled'),
      'previous_hash', _previous_hash,
      'snapshot_hash', _next_hash,
      'draft_version', _next_version,
      'result', 'accepted'
    ));

  RETURN jsonb_build_object('ok', true, 'draft_hash', _next_hash, 'draft_version', _next_version);
END;
$$;

REVOKE ALL ON FUNCTION public.eb_save_composition_draft(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_save_composition_draft(uuid, jsonb, text) TO authenticated;