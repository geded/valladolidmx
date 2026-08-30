-- G8-R1-F1C-A · Autoridad única de presentación (aditiva, reversible, idempotente)

CREATE TABLE IF NOT EXISTS public.entity_presentation_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind text NOT NULL CHECK (entity_kind IN ('business','product','event','place')),
  entity_id uuid NOT NULL,
  requested_mode text NOT NULL DEFAULT 'editorial' CHECK (requested_mode IN ('editorial','cinematic')),
  approved_mode text NOT NULL DEFAULT 'editorial' CHECK (approved_mode IN ('editorial','cinematic')),
  review_state text NOT NULL DEFAULT 'not_requested' CHECK (review_state IN ('not_requested','pending','approved','rejected')),
  cover_media_asset_id uuid NULL REFERENCES public.media_assets(id) ON DELETE SET NULL,
  reason text NULL,
  requested_by uuid NULL,
  requested_at timestamptz NULL,
  reviewed_by uuid NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS entity_presentation_modes_entity_key
  ON public.entity_presentation_modes (entity_kind, entity_id);

CREATE TABLE IF NOT EXISTS public.entity_presentation_mode_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  from_mode text NULL,
  to_mode text NULL,
  from_state text NULL,
  to_state text NULL,
  cover_media_asset_id uuid NULL,
  reason text NULL,
  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_presentation_mode_history_entity_idx
  ON public.entity_presentation_mode_history (entity_kind, entity_id, created_at DESC);

GRANT SELECT ON public.entity_presentation_modes TO authenticated;
GRANT ALL ON public.entity_presentation_modes TO service_role;
GRANT SELECT ON public.entity_presentation_mode_history TO authenticated;
GRANT ALL ON public.entity_presentation_mode_history TO service_role;

ALTER TABLE public.entity_presentation_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_presentation_mode_history ENABLE ROW LEVEL SECURITY;

-- ¿La entidad pertenece al equipo de esta empresa? (owner/manager/editor activos)
CREATE OR REPLACE FUNCTION public.epm_owning_business(_entity_kind text, _entity_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _entity_kind = 'business' THEN _entity_id
    WHEN _entity_kind = 'product' THEN (SELECT p.business_id FROM public.products p WHERE p.id = _entity_id)
    WHEN _entity_kind = 'event' THEN (SELECT e.business_id FROM public.events e WHERE e.id = _entity_id)
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.epm_can_request(_entity_kind text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_editor_or_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.business_users bu
        WHERE bu.user_id = auth.uid()
          AND bu.status = 'active'
          AND bu.role IN ('owner','manager','editor')
          AND bu.business_id = public.epm_owning_business(_entity_kind, _entity_id)
      )
$$;

-- Portada elegible para Cinematográfica (fail-closed, G8-M1)
CREATE OR REPLACE FUNCTION public.epm_eligible_cover(_entity_kind text, _entity_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_media uuid;
BEGIN
  SELECT m.id INTO v_media
  FROM public.media_assets m
  WHERE m.deleted_at IS NULL
    AND m.review_state = 'approved'
    AND m.kind = 'image'
    AND coalesce(m.pipeline_status, '') IN ('ready','completed','done')
    AND m.alt_text IS NOT NULL AND length(btrim(m.alt_text)) > 0
    AND coalesce(m.alt_text_source::text, 'none') <> 'ai_pending'
    AND m.credit IS NOT NULL AND length(btrim(m.credit)) > 0
    AND m.original_checksum IS NOT NULL
    AND coalesce(m.original_immutable, false) = true
    AND coalesce(m.width, 0) >= 1600
    AND coalesce(m.height, 0) >= 900
    AND coalesce(m.is_demo_seed, false) = false
    AND (m.metadata ? 'rights' OR m.metadata ? 'license' OR m.metadata ? 'rights_declared')
    AND EXISTS (
      SELECT 1 FROM public.business_media bm
      WHERE _entity_kind = 'business' AND bm.business_id = _entity_id AND bm.media_asset_id = m.id AND bm.role = 'cover'
      UNION ALL
      SELECT 1 FROM public.product_media pm
      WHERE _entity_kind = 'product' AND pm.product_id = _entity_id AND pm.media_asset_id = m.id AND pm.role = 'cover'
      UNION ALL
      SELECT 1 FROM public.place_media plm
      WHERE _entity_kind = 'place' AND plm.place_id = _entity_id AND plm.media_asset_id = m.id AND plm.role = 'cover'
    )
  ORDER BY m.updated_at DESC
  LIMIT 1;

  RETURN v_media;
END;
$$;

-- Solicitud (empresa) o fijación directa (staff)
CREATE OR REPLACE FUNCTION public.set_entity_presentation_mode(
  _entity_kind text,
  _entity_id uuid,
  _mode text,
  _reason text DEFAULT NULL
)
RETURNS public.entity_presentation_modes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff boolean := public.is_editor_or_admin(auth.uid());
  v_prev public.entity_presentation_modes;
  v_row public.entity_presentation_modes;
  v_cover uuid;
  v_state text;
  v_approved text;
BEGIN
  IF _entity_kind NOT IN ('business','product','event','place') THEN
    RAISE EXCEPTION 'invalid_entity_kind';
  END IF;
  IF _mode NOT IN ('editorial','cinematic') THEN
    RAISE EXCEPTION 'invalid_presentation_mode';
  END IF;
  IF NOT public.epm_can_request(_entity_kind, _entity_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_prev FROM public.entity_presentation_modes
   WHERE entity_kind = _entity_kind AND entity_id = _entity_id;

  v_cover := public.epm_eligible_cover(_entity_kind, _entity_id);

  IF _mode = 'editorial' THEN
    v_state := 'approved';
    v_approved := 'editorial';
  ELSIF v_staff THEN
    IF v_cover IS NULL THEN
      RAISE EXCEPTION 'cinematic_requires_approved_cover';
    END IF;
    v_state := 'approved';
    v_approved := 'cinematic';
  ELSE
    v_state := 'pending';
    v_approved := coalesce(v_prev.approved_mode, 'editorial');
    IF v_approved = 'cinematic' AND v_cover IS NULL THEN
      v_approved := 'editorial';
    END IF;
  END IF;

  INSERT INTO public.entity_presentation_modes AS t
    (entity_kind, entity_id, requested_mode, approved_mode, review_state,
     cover_media_asset_id, reason, requested_by, requested_at,
     reviewed_by, reviewed_at)
  VALUES
    (_entity_kind, _entity_id, _mode, v_approved, v_state,
     CASE WHEN v_approved = 'cinematic' THEN v_cover ELSE NULL END,
     _reason, auth.uid(), now(),
     CASE WHEN v_staff THEN auth.uid() ELSE NULL END,
     CASE WHEN v_staff THEN now() ELSE NULL END)
  ON CONFLICT (entity_kind, entity_id) DO UPDATE
    SET requested_mode = EXCLUDED.requested_mode,
        approved_mode = EXCLUDED.approved_mode,
        review_state = EXCLUDED.review_state,
        cover_media_asset_id = EXCLUDED.cover_media_asset_id,
        reason = EXCLUDED.reason,
        requested_by = EXCLUDED.requested_by,
        requested_at = EXCLUDED.requested_at,
        reviewed_by = COALESCE(EXCLUDED.reviewed_by, t.reviewed_by),
        reviewed_at = COALESCE(EXCLUDED.reviewed_at, t.reviewed_at),
        updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.entity_presentation_mode_history
    (entity_kind, entity_id, action, from_mode, to_mode, from_state, to_state,
     cover_media_asset_id, reason, actor_user_id)
  VALUES
    (_entity_kind, _entity_id,
     CASE WHEN v_staff THEN 'set_by_staff' ELSE 'requested' END,
     v_prev.approved_mode, v_row.approved_mode,
     v_prev.review_state, v_row.review_state,
     v_row.cover_media_asset_id, _reason, auth.uid());

  -- Compatibilidad histórica de Lugares: espejo no destructivo.
  IF _entity_kind = 'place' AND v_state = 'approved' THEN
    UPDATE public.points_of_interest
       SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('presentation_mode', v_approved)
     WHERE id = _entity_id;
  END IF;

  BEGIN
    INSERT INTO public.content_audit_log (entity_kind, entity_id, action, actor_user_id, notes, metadata)
    VALUES (
      CASE _entity_kind WHEN 'place' THEN 'point_of_interest' ELSE _entity_kind END::entity_kind,
      _entity_id,
      CASE WHEN v_staff THEN 'presentation_mode_set' ELSE 'presentation_mode_requested' END,
      auth.uid(),
      _reason,
      jsonb_build_object(
        'from_mode', v_prev.approved_mode, 'to_mode', v_row.approved_mode,
        'from_state', v_prev.review_state, 'to_state', v_row.review_state,
        'cover_media_asset_id', v_row.cover_media_asset_id,
        'gate', 'G8-R1-F1C-A'
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

-- Revisión editorial (sólo staff)
CREATE OR REPLACE FUNCTION public.review_entity_presentation_mode(
  _entity_kind text,
  _entity_id uuid,
  _decision text,
  _reason text DEFAULT NULL
)
RETURNS public.entity_presentation_modes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev public.entity_presentation_modes;
  v_row public.entity_presentation_modes;
  v_cover uuid;
BEGIN
  IF NOT public.is_editor_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _decision NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  SELECT * INTO v_prev FROM public.entity_presentation_modes
   WHERE entity_kind = _entity_kind AND entity_id = _entity_id;
  IF v_prev.id IS NULL THEN
    RAISE EXCEPTION 'no_presentation_request';
  END IF;

  IF _decision = 'approve' THEN
    IF v_prev.requested_mode = 'cinematic' THEN
      v_cover := public.epm_eligible_cover(_entity_kind, _entity_id);
      IF v_cover IS NULL THEN
        RAISE EXCEPTION 'cinematic_requires_approved_cover';
      END IF;
    END IF;
    UPDATE public.entity_presentation_modes
       SET approved_mode = v_prev.requested_mode,
           review_state = 'approved',
           cover_media_asset_id = v_cover,
           reason = _reason,
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           updated_at = now()
     WHERE id = v_prev.id
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.entity_presentation_modes
       SET approved_mode = 'editorial',
           review_state = 'rejected',
           cover_media_asset_id = NULL,
           reason = _reason,
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           updated_at = now()
     WHERE id = v_prev.id
    RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.entity_presentation_mode_history
    (entity_kind, entity_id, action, from_mode, to_mode, from_state, to_state,
     cover_media_asset_id, reason, actor_user_id)
  VALUES
    (_entity_kind, _entity_id, 'reviewed_' || _decision,
     v_prev.approved_mode, v_row.approved_mode,
     v_prev.review_state, v_row.review_state,
     v_row.cover_media_asset_id, _reason, auth.uid());

  IF _entity_kind = 'place' THEN
    UPDATE public.points_of_interest
       SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('presentation_mode', v_row.approved_mode)
     WHERE id = _entity_id;
  END IF;

  BEGIN
    INSERT INTO public.content_audit_log (entity_kind, entity_id, action, actor_user_id, notes, metadata)
    VALUES (
      CASE _entity_kind WHEN 'place' THEN 'point_of_interest' ELSE _entity_kind END::entity_kind,
      _entity_id, 'presentation_mode_' || _decision, auth.uid(), _reason,
      jsonb_build_object('from_mode', v_prev.approved_mode, 'to_mode', v_row.approved_mode, 'gate', 'G8-R1-F1C-A')
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$$;

-- Lectura del modo vigente, fail-closed en tiempo real
CREATE OR REPLACE FUNCTION public.get_entity_presentation_mode(_entity_kind text, _entity_id uuid)
RETURNS TABLE (
  effective_mode text,
  requested_mode text,
  approved_mode text,
  review_state text,
  cover_media_asset_id uuid,
  cover_eligible boolean,
  fallback_reason text,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.entity_presentation_modes;
  v_cover uuid;
  v_legacy text;
BEGIN
  SELECT * INTO v_row FROM public.entity_presentation_modes
   WHERE entity_kind = _entity_kind AND entity_id = _entity_id;

  v_cover := public.epm_eligible_cover(_entity_kind, _entity_id);

  IF v_row.id IS NULL THEN
    IF _entity_kind = 'place' THEN
      SELECT nullif(metadata->>'presentation_mode','') INTO v_legacy
        FROM public.points_of_interest WHERE id = _entity_id;
    END IF;
    IF v_legacy = 'cinematic' AND v_cover IS NOT NULL THEN
      RETURN QUERY SELECT 'cinematic', 'cinematic', 'cinematic', 'approved', v_cover, true,
                          NULL::text, 'legacy_place_metadata';
    ELSIF v_legacy = 'cinematic' THEN
      RETURN QUERY SELECT 'editorial', 'cinematic', 'cinematic', 'approved', NULL::uuid, false,
                          'cover_not_eligible', 'legacy_place_metadata';
    ELSE
      RETURN QUERY SELECT 'editorial', 'editorial', 'editorial', 'not_requested', NULL::uuid,
                          (v_cover IS NOT NULL), NULL::text,
                          CASE WHEN v_legacy IS NULL THEN 'default' ELSE 'legacy_place_metadata' END;
    END IF;
    RETURN;
  END IF;

  IF v_row.approved_mode = 'cinematic' AND v_cover IS NULL THEN
    RETURN QUERY SELECT 'editorial', v_row.requested_mode, v_row.approved_mode, v_row.review_state,
                        v_row.cover_media_asset_id, false, 'cover_not_eligible', 'entity_presentation_modes';
  ELSE
    RETURN QUERY SELECT v_row.approved_mode, v_row.requested_mode, v_row.approved_mode, v_row.review_state,
                        v_row.cover_media_asset_id, (v_cover IS NOT NULL), NULL::text, 'entity_presentation_modes';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='entity_presentation_modes'
      AND policyname='epm_select_team_or_staff'
  ) THEN
    CREATE POLICY "epm_select_team_or_staff" ON public.entity_presentation_modes
      FOR SELECT TO authenticated
      USING (public.epm_can_request(entity_kind, entity_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='entity_presentation_mode_history'
      AND policyname='epmh_select_team_or_staff'
  ) THEN
    CREATE POLICY "epmh_select_team_or_staff" ON public.entity_presentation_mode_history
      FOR SELECT TO authenticated
      USING (public.epm_can_request(entity_kind, entity_id));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.set_entity_presentation_mode(text, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_entity_presentation_mode(text, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.epm_can_request(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.epm_owning_business(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.epm_eligible_cover(text, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_entity_presentation_mode(text, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_entity_presentation_mode(text, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.epm_can_request(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.epm_owning_business(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.epm_eligible_cover(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_entity_presentation_mode(text, uuid) TO anon, authenticated, service_role;