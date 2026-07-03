
ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_publish_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS scheduled_publish_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_page_compositions_scheduled_publish_at
  ON public.page_compositions(scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL;

-- Programar publicación
CREATE OR REPLACE FUNCTION public.eb_schedule_publish_composition(
  _id UUID,
  _when TIMESTAMPTZ,
  _notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden: only admins can schedule publications';
  END IF;
  IF _when IS NULL OR _when <= now() THEN
    RAISE EXCEPTION 'scheduled time must be in the future';
  END IF;

  UPDATE public.page_compositions
    SET scheduled_publish_at = _when,
        scheduled_publish_by = _uid,
        scheduled_publish_notes = _notes,
        updated_by = _uid
  WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'composition not found';
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes, metadata)
  VALUES ('composition', _id, 'Composition.PublishScheduled', _uid, _notes,
          jsonb_build_object('scheduled_publish_at', _when));
END;
$$;
REVOKE ALL ON FUNCTION public.eb_schedule_publish_composition(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_schedule_publish_composition(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

-- Cancelar programación
CREATE OR REPLACE FUNCTION public.eb_cancel_scheduled_publish(
  _id UUID,
  _notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'forbidden: only admins can cancel scheduled publications';
  END IF;

  UPDATE public.page_compositions
    SET scheduled_publish_at = NULL,
        scheduled_publish_by = NULL,
        scheduled_publish_notes = NULL,
        updated_by = _uid
  WHERE id = _id AND scheduled_publish_at IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'composition has no scheduled publication';
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('composition', _id, 'Composition.PublishScheduleCancelled', _uid, _notes);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_cancel_scheduled_publish(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_cancel_scheduled_publish(UUID, TEXT) TO authenticated;

-- Ejecutar publicaciones programadas pendientes.
-- Reproduce la lógica de eb_publish_composition sin depender de auth.uid()
-- para que pueda ser llamada por el sistema (cron).
CREATE OR REPLACE FUNCTION public.eb_process_scheduled_publishes()
RETURNS TABLE(composition_id UUID, revision_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row RECORD;
  _rev_id UUID;
  _next INT;
BEGIN
  FOR _row IN
    SELECT id, current_draft, page_type, COALESCE(variant_key, 'default') AS variant_key,
           scheduled_publish_by, scheduled_publish_notes
    FROM public.page_compositions
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF _row.current_draft IS NULL THEN
      -- Nada que publicar; cancelamos silenciosamente la programación
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

    -- Despublicar otras publicaciones del mismo (page_type, variant_key)
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
REVOKE ALL ON FUNCTION public.eb_process_scheduled_publishes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() TO service_role, authenticated;
