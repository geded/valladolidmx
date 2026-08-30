DO $$
DECLARE
  _home constant uuid := '50d2f632-70bc-4c79-b569-a8a2885d8030';
  _rev30 constant uuid := '3542e3d4-21c9-4cd6-83a2-ce166374b880';
  _rev31 constant uuid := '6fe7cf44-e7ad-44fb-b0c4-3457059f5fce';
  _snapshot30 jsonb;
BEGIN
  SELECT snapshot INTO _snapshot30
  FROM public.page_revisions
  WHERE id = _rev30
    AND composition_id = _home
    AND revision_number = 30;

  IF _snapshot30 IS NULL THEN
    RAISE EXCEPTION 'G8-R1-F1J-HOME-PREMIUM-R1: revision 30 not found for Home';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.page_revisions
    WHERE id = _rev31
      AND composition_id = _home
      AND revision_number = 31
  ) THEN
    RAISE EXCEPTION 'G8-R1-F1J-HOME-PREMIUM-R1: revision 31 preservation check failed';
  END IF;

  UPDATE public.page_compositions
  SET active_revision_id = _rev30,
      status = 'published',
      workflow_state = 'published',
      workflow_updated_at = now(),
      workflow_notes = 'G8-R1-F1J-HOME-PREMIUM-R1 · rollback urgente a revisión 30',
      approved_revision_id = _rev30,
      approved_snapshot_hash = public.eb_i4_snapshot_hash(_snapshot30),
      published_at = now(),
      updated_at = now()
  WHERE id = _home
    AND active_revision_id IS DISTINCT FROM _rev30;

  IF FOUND THEN
    INSERT INTO public.content_audit_log(
      entity_kind, entity_id, action, to_status, notes, metadata
    ) VALUES (
      'composition', _home, 'Composition.RollbackPublished', 'published',
      'G8-R1-F1J-HOME-PREMIUM-R1 · rollback urgente a revisión 30',
      jsonb_build_object(
        'from_revision_id', _rev31,
        'to_revision_id', _rev30,
        'to_revision_number', 30,
        'revision_31_preserved', true,
        'reason', 'visible_home_smart_block_failures'
      )
    );
  END IF;
END $$;