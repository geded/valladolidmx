-- OMXDS V1 · I4-C · Preview, Concurrency, Audit & Rollback
-- Additive, reversible, data-neutral migration. No production data is touched.

ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS draft_version bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft_hash text;

ALTER TABLE public.composition_preview_tokens
  ADD COLUMN IF NOT EXISTS token_digest text,
  ADD COLUMN IF NOT EXISTS snapshot jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_hash text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoke_reason text;

DO $$ BEGIN
  ALTER TABLE public.page_compositions
    ADD CONSTRAINT page_compositions_draft_hash_chk
    CHECK (draft_hash IS NULL OR draft_hash ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.composition_preview_tokens
    ADD CONSTRAINT composition_preview_tokens_token_digest_chk
    CHECK (token_digest IS NULL OR token_digest ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.composition_preview_tokens
    ADD CONSTRAINT composition_preview_tokens_snapshot_hash_chk
    CHECK (snapshot_hash IS NULL OR snapshot_hash ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS composition_preview_tokens_digest_uidx
  ON public.composition_preview_tokens(token_digest)
  WHERE token_digest IS NOT NULL;
CREATE INDEX IF NOT EXISTS composition_preview_tokens_revoked_idx
  ON public.composition_preview_tokens(revoked_at)
  WHERE revoked_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.eb_i4_token_digest(_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT encode(public.digest(convert_to(_token, 'UTF8'), 'sha256'), 'hex');
$$;
REVOKE ALL ON FUNCTION public.eb_i4_token_digest(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.eb_save_composition_draft(_id uuid, _tree jsonb, _expected_hash text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _previous_state text;
  _previous_hash text;
  _next_hash text;
  _next_version bigint;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')
  ) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF _tree IS NULL OR jsonb_typeof(_tree) <> 'object' THEN
    RAISE EXCEPTION 'invalid_composition_tree' USING ERRCODE = '22023';
  END IF;

  SELECT workflow_state, COALESCE(draft_hash, public.eb_i4_snapshot_hash(current_draft))
    INTO _previous_state, _previous_hash
  FROM public.page_compositions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002'; END IF;

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
         workflow_state = 'draft', workflow_updated_at = now(), workflow_updated_by = _uid, workflow_notes = NULL,
         approved_revision_id = NULL, approved_snapshot_hash = NULL, approved_by = NULL, approved_at = NULL,
         scheduled_publish_at = NULL, scheduled_publish_by = NULL, scheduled_publish_notes = NULL,
         scheduled_revision_id = NULL, scheduled_snapshot_hash = NULL, updated_by = _uid
   WHERE id = _id
   RETURNING draft_version INTO _next_version;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('composition', _id, 'Composition.DraftSaved', _uid,
    jsonb_build_object('previous_workflow_state', _previous_state, 'approval_invalidated', _previous_state IN ('approved','scheduled'),
      'previous_hash', _previous_hash, 'snapshot_hash', _next_hash, 'draft_version', _next_version, 'result', 'accepted'));
  RETURN jsonb_build_object('ok', true, 'draft_hash', _next_hash, 'draft_version', _next_version);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_save_composition_draft(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_save_composition_draft(uuid, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_restore_revision(_id uuid, _revision_id uuid, _expected_hash text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _snapshot jsonb; _hash text; _previous_hash text; _next_version bigint;
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')
  ) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(draft_hash, public.eb_i4_snapshot_hash(current_draft)) INTO _previous_hash FROM public.page_compositions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002'; END IF;
  IF _expected_hash IS NULL OR _expected_hash <> _previous_hash THEN
    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
    VALUES ('revision', _revision_id, 'Composition.RollbackConflict', _uid,
      jsonb_build_object('composition_id', _id, 'expected_hash', _expected_hash, 'actual_hash', _previous_hash, 'result', 'rejected', 'reason', 'draft_changed'));
    RAISE EXCEPTION 'draft_conflict' USING ERRCODE = '40001';
  END IF;
  SELECT snapshot, COALESCE(snapshot_hash, public.eb_i4_snapshot_hash(snapshot)) INTO _snapshot, _hash
  FROM public.page_revisions WHERE id = _revision_id AND composition_id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'revision not found for composition' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.page_compositions
     SET current_draft = _snapshot, draft_version = draft_version + 1, draft_hash = _hash,
         draft_author_id = _uid, workflow_state = 'draft', workflow_updated_at = now(), workflow_updated_by = _uid, workflow_notes = NULL,
         approved_revision_id = NULL, approved_snapshot_hash = NULL, approved_by = NULL, approved_at = NULL,
         scheduled_publish_at = NULL, scheduled_publish_by = NULL, scheduled_publish_notes = NULL,
         scheduled_revision_id = NULL, scheduled_snapshot_hash = NULL, updated_by = _uid
   WHERE id = _id RETURNING draft_version INTO _next_version;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('revision', _revision_id, 'Composition.RevisionRestored', _uid,
    jsonb_build_object('composition_id', _id, 'previous_hash', _previous_hash, 'snapshot_hash', _hash, 'draft_version', _next_version,
      'publishes_automatically', false, 'approval_invalidated', true, 'result', 'accepted'));
  RETURN jsonb_build_object('ok', true, 'draft_hash', _hash, 'draft_version', _next_version);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_restore_revision(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_restore_revision(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_issue_composition_preview(_composition_id uuid, _token_digest text, _ttl_minutes integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _snapshot jsonb; _hash text; _expires timestamptz; _stored_key text;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT current_draft, COALESCE(draft_hash, public.eb_i4_snapshot_hash(current_draft)) INTO _snapshot, _hash
  FROM public.page_compositions WHERE id = _composition_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002'; END IF;
  _expires := now() + make_interval(mins => GREATEST(5, LEAST(10080, COALESCE(_ttl_minutes, 1440))));
  _stored_key := _token_digest;
  INSERT INTO public.composition_preview_tokens(token, token_digest, composition_id, created_by, expires_at, snapshot, snapshot_hash)
  VALUES (_stored_key, _token_digest, _composition_id, _uid, _expires, _snapshot, _hash);
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('composition', _composition_id, 'Composition.PreviewIssued', _uid,
    jsonb_build_object('snapshot_hash', _hash, 'expires_at', _expires, 'result', 'accepted'));
  RETURN jsonb_build_object('expires_at', _expires, 'snapshot_hash', _hash);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_issue_composition_preview(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_issue_composition_preview(uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_revoke_composition_preview(_token_digest text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _composition_id uuid; _hash text;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid, 'super_admin') OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'editor')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE public.composition_preview_tokens
     SET revoked_at = now(), revoked_by = _uid, revoke_reason = _reason
   WHERE token_digest = _token_digest AND revoked_at IS NULL
   RETURNING composition_id, snapshot_hash INTO _composition_id, _hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'preview token not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes, metadata)
  VALUES ('composition', _composition_id, 'Composition.PreviewRevoked', _uid, _reason,
    jsonb_build_object('snapshot_hash', _hash, 'result', 'accepted'));
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_revoke_composition_preview(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_revoke_composition_preview(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_resolve_composition_preview(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _digest text := public.eb_i4_token_digest(_token); _row record; _action text; _reason text;
BEGIN
  SELECT * INTO _row FROM public.composition_preview_tokens
  WHERE token_digest = _digest OR (token_digest IS NULL AND token = _token)
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF _row.revoked_at IS NOT NULL THEN _action := 'Composition.PreviewRejected'; _reason := 'revoked';
  ELSIF _row.expires_at <= now() THEN _action := 'Composition.PreviewExpired'; _reason := 'expired';
  ELSE _action := 'Composition.PreviewResolved'; _reason := 'accepted'; END IF;
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, metadata)
  VALUES ('composition', _row.composition_id, _action,
    jsonb_build_object('snapshot_hash', _row.snapshot_hash, 'result', CASE WHEN _reason='accepted' THEN 'accepted' ELSE 'rejected' END, 'reason', _reason));
  IF _reason <> 'accepted' THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('composition_id', _row.composition_id, 'expires_at', _row.expires_at,
    'snapshot_hash', _row.snapshot_hash, 'snapshot', _row.snapshot);
END;
$$;
REVOKE ALL ON FUNCTION public.eb_resolve_composition_preview(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_resolve_composition_preview(text) TO service_role;
