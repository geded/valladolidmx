-- Fase 3.2 · Cierre del riesgo R1
-- Restringir eb_process_scheduled_publishes: sólo service_role o admin pueden ejecutarla.

-- 1. Revocar el GRANT amplio a authenticated
REVOKE EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() FROM authenticated;

-- 2. Reemplazar la función añadiendo guard interno (defensa en profundidad)
CREATE OR REPLACE FUNCTION public.eb_process_scheduled_publishes()
RETURNS TABLE(composition_id UUID, revision_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row RECORD;
  _rev_id UUID;
  _next INT;
  _caller TEXT := current_setting('role', true);
  _uid UUID := auth.uid();
BEGIN
  -- Guard: sólo service_role o admins pueden invocar publicación masiva.
  IF NOT (
    _caller = 'service_role'
    OR session_user = 'service_role'
    OR (_uid IS NOT NULL AND (
      public.has_role(_uid, 'admin')
      OR public.has_role(_uid, 'super_admin')
    ))
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege: eb_process_scheduled_publishes requires service_role or admin'
      USING ERRCODE = '42501';
  END IF;

  FOR _row IN
    SELECT id, current_draft, page_type, COALESCE(variant_key, 'default') AS variant_key,
           scheduled_publish_by, scheduled_publish_notes
    FROM public.page_compositions
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF _row.current_draft IS NULL THEN
      UPDATE public.page_compositions
        SET scheduled_publish_at = NULL,
            scheduled_publish_by = NULL,
            scheduled_publish_notes = NULL
      WHERE id = _row.id;
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO _next
    FROM public.page_revisions WHERE composition_id = _row.id;

    INSERT INTO public.page_revisions(composition_id, revision_number, snapshot, notes, created_by)
    VALUES (_row.id, _next, _row.current_draft,
            COALESCE(_row.scheduled_publish_notes, 'Publicación programada'),
            _row.scheduled_publish_by)
    RETURNING id INTO _rev_id;

    UPDATE public.page_compositions
      SET status = 'draft', published_at = NULL, published_by = NULL
    WHERE status = 'published'
      AND page_type = _row.page_type
      AND COALESCE(variant_key, 'default') = _row.variant_key
      AND id <> _row.id;

    UPDATE public.page_compositions
      SET status = 'published',
          active_revision_id = _rev_id,
          published_at = now(),
          published_by = _row.scheduled_publish_by,
          scheduled_publish_at = NULL,
          scheduled_publish_by = NULL,
          scheduled_publish_notes = NULL
    WHERE id = _row.id;

    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, to_status, actor_user_id, notes)
    VALUES ('composition', _row.id, 'Composition.Published', 'published',
            _row.scheduled_publish_by,
            COALESCE(_row.scheduled_publish_notes, 'Publicación programada (automática)'));

    composition_id := _row.id;
    revision_id := _rev_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 3. Reafirmar permisos: sólo service_role
REVOKE ALL ON FUNCTION public.eb_process_scheduled_publishes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() FROM anon;
GRANT EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() TO service_role;