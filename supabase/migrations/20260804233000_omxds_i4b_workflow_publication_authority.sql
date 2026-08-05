-- OMXDS V1 · I4-B · Workflow, RBAC & Publication Authority
-- Additive, data-neutral migration. Existing rows remain readable and must
-- complete the new review cycle before they can be published or scheduled.

ALTER TABLE public.page_revisions
  ADD COLUMN IF NOT EXISTS snapshot_hash text;

ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS draft_author_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_revision_id uuid REFERENCES public.page_revisions(id),
  ADD COLUMN IF NOT EXISTS approved_snapshot_hash text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_revision_id uuid REFERENCES public.page_revisions(id),
  ADD COLUMN IF NOT EXISTS scheduled_snapshot_hash text;

ALTER TABLE public.page_compositions
  DROP CONSTRAINT IF EXISTS page_compositions_workflow_state_chk;
ALTER TABLE public.page_compositions
  ADD CONSTRAINT page_compositions_workflow_state_chk
  CHECK (workflow_state IN ('draft','in_review','approved','scheduled','published'));

DO $$ BEGIN
  ALTER TABLE public.page_revisions
    ADD CONSTRAINT page_revisions_snapshot_hash_chk
    CHECK (snapshot_hash IS NULL OR snapshot_hash ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.page_compositions
    ADD CONSTRAINT page_compositions_approved_snapshot_hash_chk
    CHECK (approved_snapshot_hash IS NULL OR approved_snapshot_hash ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.page_compositions
    ADD CONSTRAINT page_compositions_scheduled_snapshot_hash_chk
    CHECK (scheduled_snapshot_hash IS NULL OR scheduled_snapshot_hash ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_page_compositions_approved_revision
  ON public.page_compositions(approved_revision_id)
  WHERE approved_revision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_compositions_scheduled_revision
  ON public.page_compositions(scheduled_revision_id)
  WHERE scheduled_revision_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.eb_i4_snapshot_hash(_snapshot jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT encode(public.digest(convert_to(_snapshot::text, 'UTF8'), 'sha256'), 'hex');
$$;
REVOKE ALL ON FUNCTION public.eb_i4_snapshot_hash(jsonb) FROM PUBLIC, anon, authenticated;

-- All writes use SECURITY DEFINER RPCs. Direct table writes would otherwise
-- permit callers to change approval identity or the published revision.
REVOKE INSERT, UPDATE, DELETE ON public.page_compositions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.page_revisions FROM authenticated;

CREATE OR REPLACE FUNCTION public.eb_save_composition_draft(_id uuid, _tree jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _previous_state text;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR
    public.has_role(_uid, 'admin') OR
    public.has_role(_uid, 'editor')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _tree IS NULL OR jsonb_typeof(_tree) <> 'object' THEN
    RAISE EXCEPTION 'invalid_composition_tree' USING ERRCODE = '22023';
  END IF;

  SELECT workflow_state INTO _previous_state
  FROM public.page_compositions
  WHERE id = _id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.page_compositions
     SET current_draft = _tree,
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
   WHERE id = _id;

  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, actor_user_id, metadata
  ) VALUES (
    'composition', _id, 'Composition.DraftSaved', _uid,
    jsonb_build_object(
      'previous_workflow_state', _previous_state,
      'approval_invalidated', _previous_state IN ('approved','scheduled'),
      'snapshot_hash', public.eb_i4_snapshot_hash(_tree)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.eb_save_composition_draft(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_save_composition_draft(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_create_revision(_id uuid, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _rev_id uuid;
  _next integer;
  _draft jsonb;
  _hash text;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR
    public.has_role(_uid, 'admin') OR
    public.has_role(_uid, 'editor')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT current_draft INTO _draft
  FROM public.page_compositions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002'; END IF;
  _hash := public.eb_i4_snapshot_hash(_draft);
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO _next
  FROM public.page_revisions WHERE composition_id = _id;
  INSERT INTO public.page_revisions(
    composition_id, revision_number, snapshot, snapshot_hash, notes, created_by
  ) VALUES (_id, _next, _draft, _hash, _notes, _uid)
  RETURNING id INTO _rev_id;

  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, actor_user_id, notes, metadata
  ) VALUES (
    'revision', _rev_id, 'Composition.RevisionCreated', _uid, _notes,
    jsonb_build_object('composition_id', _id, 'snapshot_hash', _hash, 'revision_number', _next)
  );
  RETURN _rev_id;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_create_revision(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_create_revision(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_restore_revision(_id uuid, _revision_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _snapshot jsonb;
  _hash text;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR
    public.has_role(_uid, 'admin') OR
    public.has_role(_uid, 'editor')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.page_compositions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002'; END IF;
  SELECT snapshot, COALESCE(snapshot_hash, public.eb_i4_snapshot_hash(snapshot))
    INTO _snapshot, _hash
  FROM public.page_revisions
  WHERE id = _revision_id AND composition_id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'revision not found for composition' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.page_compositions
     SET current_draft = _snapshot,
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
   WHERE id = _id;

  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, actor_user_id, metadata
  ) VALUES (
    'revision', _revision_id, 'Composition.RevisionRestored', _uid,
    jsonb_build_object('composition_id', _id, 'snapshot_hash', _hash, 'publishes_automatically', false)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.eb_restore_revision(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_restore_revision(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_set_workflow_state(
  _composition_id uuid,
  _next_state text,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _current text;
  _author uuid;
  _draft jsonb;
  _hash text;
  _revision_id uuid;
  _next_revision integer;
  _is_admin boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  _is_admin := public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin');
  IF NOT (_is_admin OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _next_state NOT IN ('draft','in_review','approved') THEN
    RAISE EXCEPTION 'invalid_state:%', _next_state USING ERRCODE = '22023';
  END IF;

  SELECT workflow_state, COALESCE(draft_author_id, updated_by, created_by), current_draft
    INTO _current, _author, _draft
  FROM public.page_compositions
  WHERE id = _composition_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF _current = _next_state THEN
    RETURN jsonb_build_object('workflow_state', _current, 'changed', false);
  END IF;

  IF _next_state = 'in_review' AND _current <> 'draft' THEN
    RAISE EXCEPTION 'invalid_transition:%->%', _current, _next_state USING ERRCODE = '22023';
  ELSIF _next_state = 'approved' AND _current <> 'in_review' THEN
    RAISE EXCEPTION 'invalid_transition:%->%', _current, _next_state USING ERRCODE = '22023';
  ELSIF _next_state = 'draft' AND _current NOT IN ('in_review','approved','scheduled','published') THEN
    RAISE EXCEPTION 'invalid_transition:%->%', _current, _next_state USING ERRCODE = '22023';
  END IF;

  IF _next_state = 'approved' THEN
    IF NOT _is_admin THEN RAISE EXCEPTION 'forbidden_approve' USING ERRCODE = '42501'; END IF;
    IF _author IS NULL THEN RAISE EXCEPTION 'missing_author_identity' USING ERRCODE = '22023'; END IF;
    IF _author = _uid THEN RAISE EXCEPTION 'author_cannot_self_approve' USING ERRCODE = '42501'; END IF;
    _hash := public.eb_i4_snapshot_hash(_draft);
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO _next_revision
    FROM public.page_revisions WHERE composition_id = _composition_id;
    INSERT INTO public.page_revisions(
      composition_id, revision_number, snapshot, snapshot_hash, notes, created_by
    ) VALUES (
      _composition_id, _next_revision, _draft, _hash,
      COALESCE(_notes, 'Snapshot aprobado I4-B'), _author
    ) RETURNING id INTO _revision_id;

    UPDATE public.page_compositions
       SET workflow_state = 'approved',
           workflow_updated_at = now(),
           workflow_updated_by = _uid,
           workflow_notes = _notes,
           approved_revision_id = _revision_id,
           approved_snapshot_hash = _hash,
           approved_by = _uid,
           approved_at = now(),
           scheduled_publish_at = NULL,
           scheduled_publish_by = NULL,
           scheduled_publish_notes = NULL,
           scheduled_revision_id = NULL,
           scheduled_snapshot_hash = NULL
     WHERE id = _composition_id;
  ELSE
    UPDATE public.page_compositions
       SET workflow_state = _next_state,
           workflow_updated_at = now(),
           workflow_updated_by = _uid,
           workflow_notes = _notes,
           approved_revision_id = CASE WHEN _next_state = 'draft' THEN NULL ELSE approved_revision_id END,
           approved_snapshot_hash = CASE WHEN _next_state = 'draft' THEN NULL ELSE approved_snapshot_hash END,
           approved_by = CASE WHEN _next_state = 'draft' THEN NULL ELSE approved_by END,
           approved_at = CASE WHEN _next_state = 'draft' THEN NULL ELSE approved_at END,
           scheduled_publish_at = CASE WHEN _next_state = 'draft' THEN NULL ELSE scheduled_publish_at END,
           scheduled_publish_by = CASE WHEN _next_state = 'draft' THEN NULL ELSE scheduled_publish_by END,
           scheduled_publish_notes = CASE WHEN _next_state = 'draft' THEN NULL ELSE scheduled_publish_notes END,
           scheduled_revision_id = CASE WHEN _next_state = 'draft' THEN NULL ELSE scheduled_revision_id END,
           scheduled_snapshot_hash = CASE WHEN _next_state = 'draft' THEN NULL ELSE scheduled_snapshot_hash END
     WHERE id = _composition_id;
  END IF;

  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, actor_user_id, notes, metadata
  ) VALUES (
    'composition', _composition_id, 'Composition.WorkflowTransition', _uid, _notes,
    jsonb_build_object(
      'from', _current, 'to', _next_state, 'author_id', _author,
      'approver_id', CASE WHEN _next_state = 'approved' THEN _uid ELSE NULL END,
      'approved_revision_id', _revision_id, 'snapshot_hash', _hash
    )
  );
  RETURN jsonb_build_object(
    'workflow_state', _next_state,
    'changed', true,
    'approved_revision_id', _revision_id,
    'approved_snapshot_hash', _hash
  );
END;
$$;
REVOKE ALL ON FUNCTION public.eb_set_workflow_state(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_set_workflow_state(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_publish_composition(_id uuid, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _revision_id uuid;
  _approved_hash text;
  _actual_hash text;
  _page_type text;
  _variant text;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden: only admins can publish compositions' USING ERRCODE = '42501';
  END IF;

  SELECT approved_revision_id, approved_snapshot_hash, page_type, COALESCE(variant_key, 'default')
    INTO _revision_id, _approved_hash, _page_type, _variant
  FROM public.page_compositions
  WHERE id = _id AND workflow_state = 'approved'
  FOR UPDATE;
  IF NOT FOUND OR _revision_id IS NULL OR _approved_hash IS NULL THEN
    RAISE EXCEPTION 'publication_requires_approved_snapshot' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(snapshot_hash, public.eb_i4_snapshot_hash(snapshot)) INTO _actual_hash
  FROM public.page_revisions
  WHERE id = _revision_id AND composition_id = _id;
  IF NOT FOUND OR _actual_hash <> _approved_hash THEN
    RAISE EXCEPTION 'approved_snapshot_hash_mismatch' USING ERRCODE = '22023';
  END IF;

  UPDATE public.page_compositions
     SET status = 'draft', published_at = NULL, published_by = NULL, updated_by = _uid
   WHERE status = 'published'
     AND page_type = _page_type
     AND COALESCE(variant_key, 'default') = _variant
     AND id <> _id;
  UPDATE public.page_compositions
     SET status = 'published',
         active_revision_id = _revision_id,
         published_at = now(),
         published_by = _uid,
         workflow_state = 'published',
         workflow_updated_at = now(),
         workflow_updated_by = _uid,
         workflow_notes = _notes,
         scheduled_publish_at = NULL,
         scheduled_publish_by = NULL,
         scheduled_publish_notes = NULL,
         scheduled_revision_id = NULL,
         scheduled_snapshot_hash = NULL,
         updated_by = _uid
   WHERE id = _id;

  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, to_status, actor_user_id, notes, metadata
  ) VALUES (
    'composition', _id, 'Composition.Published', 'published', _uid, _notes,
    jsonb_build_object(
      'revision_id', _revision_id, 'snapshot_hash', _approved_hash,
      'approved_by', (SELECT approved_by FROM public.page_compositions WHERE id = _id)
    )
  );
  RETURN _revision_id;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_publish_composition(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_publish_composition(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_unpublish_composition(_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden: only admins can unpublish compositions' USING ERRCODE = '42501';
  END IF;
  UPDATE public.page_compositions
     SET status = 'draft',
         published_at = NULL,
         published_by = NULL,
         workflow_state = 'draft',
         workflow_updated_at = now(),
         workflow_updated_by = _uid,
         workflow_notes = _notes,
         approved_revision_id = NULL,
         approved_snapshot_hash = NULL,
         approved_by = NULL,
         approved_at = NULL,
         updated_by = _uid
   WHERE id = _id AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'composition is not currently published' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, to_status, actor_user_id, notes
  ) VALUES ('composition', _id, 'Composition.Unpublished', 'draft', _uid, _notes);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_unpublish_composition(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_unpublish_composition(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_schedule_publish_composition(
  _id uuid, _when timestamptz, _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _revision_id uuid;
  _approved_hash text;
  _actual_hash text;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden: only admins can schedule publications' USING ERRCODE = '42501';
  END IF;
  IF _when IS NULL OR _when <= now() THEN
    RAISE EXCEPTION 'scheduled time must be in the future' USING ERRCODE = '22023';
  END IF;

  SELECT approved_revision_id, approved_snapshot_hash
    INTO _revision_id, _approved_hash
  FROM public.page_compositions
  WHERE id = _id AND workflow_state = 'approved'
  FOR UPDATE;
  IF NOT FOUND OR _revision_id IS NULL OR _approved_hash IS NULL THEN
    RAISE EXCEPTION 'schedule_requires_approved_snapshot' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(snapshot_hash, public.eb_i4_snapshot_hash(snapshot)) INTO _actual_hash
  FROM public.page_revisions
  WHERE id = _revision_id AND composition_id = _id;
  IF NOT FOUND OR _actual_hash <> _approved_hash THEN
    RAISE EXCEPTION 'approved_snapshot_hash_mismatch' USING ERRCODE = '22023';
  END IF;

  UPDATE public.page_compositions
     SET scheduled_publish_at = _when,
         scheduled_publish_by = _uid,
         scheduled_publish_notes = _notes,
         scheduled_revision_id = _revision_id,
         scheduled_snapshot_hash = _approved_hash,
         workflow_state = 'scheduled',
         workflow_updated_at = now(),
         workflow_updated_by = _uid,
         workflow_notes = _notes,
         updated_by = _uid
   WHERE id = _id;
  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, actor_user_id, notes, metadata
  ) VALUES (
    'composition', _id, 'Composition.PublishScheduled', _uid, _notes,
    jsonb_build_object(
      'scheduled_publish_at', _when, 'revision_id', _revision_id,
      'snapshot_hash', _approved_hash
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.eb_schedule_publish_composition(uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_schedule_publish_composition(uuid, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_cancel_scheduled_publish(_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden: only admins can cancel scheduled publications' USING ERRCODE = '42501';
  END IF;
  UPDATE public.page_compositions
     SET scheduled_publish_at = NULL,
         scheduled_publish_by = NULL,
         scheduled_publish_notes = NULL,
         scheduled_revision_id = NULL,
         scheduled_snapshot_hash = NULL,
         workflow_state = 'approved',
         workflow_updated_at = now(),
         workflow_updated_by = _uid,
         workflow_notes = _notes,
         updated_by = _uid
   WHERE id = _id
     AND workflow_state = 'scheduled'
     AND approved_revision_id IS NOT NULL
     AND approved_snapshot_hash IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition has no valid scheduled publication' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.content_audit_log(
    entity_kind, entity_id, action, actor_user_id, notes
  ) VALUES ('composition', _id, 'Composition.PublishScheduleCancelled', _uid, _notes);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_cancel_scheduled_publish(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_cancel_scheduled_publish(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_process_scheduled_publishes()
RETURNS TABLE(composition_id uuid, revision_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row record;
  _actual_hash text;
BEGIN
  FOR _row IN
    SELECT id, page_type, COALESCE(variant_key, 'default') AS variant_key,
           scheduled_publish_by, scheduled_publish_notes,
           scheduled_revision_id, scheduled_snapshot_hash
    FROM public.page_compositions
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COALESCE(snapshot_hash, public.eb_i4_snapshot_hash(snapshot)) INTO _actual_hash
    FROM public.page_revisions
    WHERE id = _row.scheduled_revision_id AND composition_id = _row.id;

    IF _row.scheduled_revision_id IS NULL
       OR _row.scheduled_snapshot_hash IS NULL
       OR _actual_hash IS DISTINCT FROM _row.scheduled_snapshot_hash THEN
      UPDATE public.page_compositions
         SET scheduled_publish_at = NULL,
             scheduled_publish_by = NULL,
             scheduled_publish_notes = NULL,
             scheduled_revision_id = NULL,
             scheduled_snapshot_hash = NULL,
             workflow_state = 'draft',
             workflow_updated_at = now(),
             workflow_notes = 'scheduled snapshot rejected by I4-B'
       WHERE id = _row.id;
      INSERT INTO public.content_audit_log(
        entity_kind, entity_id, action, actor_user_id, notes, metadata
      ) VALUES (
        'composition', _row.id, 'Composition.PublishRejected', _row.scheduled_publish_by,
        'scheduled snapshot is absent or no longer exact',
        jsonb_build_object('revision_id', _row.scheduled_revision_id, 'snapshot_hash', _row.scheduled_snapshot_hash)
      );
      CONTINUE;
    END IF;

    UPDATE public.page_compositions
       SET status = 'draft', published_at = NULL, published_by = NULL
     WHERE status = 'published'
       AND page_type = _row.page_type
       AND COALESCE(variant_key, 'default') = _row.variant_key
       AND id <> _row.id;
    UPDATE public.page_compositions
       SET status = 'published',
           active_revision_id = _row.scheduled_revision_id,
           published_at = now(),
           published_by = _row.scheduled_publish_by,
           scheduled_publish_at = NULL,
           scheduled_publish_by = NULL,
           scheduled_publish_notes = NULL,
           scheduled_revision_id = NULL,
           scheduled_snapshot_hash = NULL,
           workflow_state = 'published',
           workflow_updated_at = now(),
           workflow_updated_by = _row.scheduled_publish_by,
           workflow_notes = _row.scheduled_publish_notes
     WHERE id = _row.id;
    INSERT INTO public.content_audit_log(
      entity_kind, entity_id, action, to_status, actor_user_id, notes, metadata
    ) VALUES (
      'composition', _row.id, 'Composition.Published', 'published',
      _row.scheduled_publish_by, COALESCE(_row.scheduled_publish_notes, 'Publicación programada'),
      jsonb_build_object(
        'scheduled', true, 'revision_id', _row.scheduled_revision_id,
        'snapshot_hash', _row.scheduled_snapshot_hash
      )
    );
    composition_id := _row.id;
    revision_id := _row.scheduled_revision_id;
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_process_scheduled_publishes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_process_scheduled_publishes() TO service_role;

-- The legacy publish-reset trigger would erase the approved/published state.
DROP TRIGGER IF EXISTS trg_eb_reset_workflow_on_publish ON public.page_compositions;

COMMENT ON FUNCTION public.eb_publish_composition(uuid, text) IS
  'I4-B: publishes only the immutable revision and SHA-256 snapshot approved by a distinct actor.';
COMMENT ON FUNCTION public.eb_process_scheduled_publishes() IS
  'I4-B: service-role only; publishes only the exact immutable revision/hash captured when scheduled.';

