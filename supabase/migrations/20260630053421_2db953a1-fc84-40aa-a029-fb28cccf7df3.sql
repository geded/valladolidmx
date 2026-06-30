
-- 14.60.1 (parte 2) — Tablas, RLS y RPCs del dominio Concierge

-- Tablas ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.concierge_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','triaged','in_progress','awaiting_traveler','awaiting_business','closed_won','closed_lost','archived')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('travel_plan','marketplace_product','manual')),
  summary TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concierge_cases TO authenticated;
GRANT ALL ON public.concierge_cases TO service_role;
ALTER TABLE public.concierge_cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_concierge_cases_traveler ON public.concierge_cases(traveler_user_id);
CREATE INDEX IF NOT EXISTS idx_concierge_cases_status   ON public.concierge_cases(status);
DROP TRIGGER IF EXISTS trg_concierge_cases_updated_at ON public.concierge_cases;
CREATE TRIGGER trg_concierge_cases_updated_at
  BEFORE UPDATE ON public.concierge_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.concierge_case_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('traveler','concierge','concierge_lead','observer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, user_id, role)
);
GRANT SELECT ON public.concierge_case_participants TO authenticated;
GRANT ALL ON public.concierge_case_participants TO service_role;
ALTER TABLE public.concierge_case_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ccp_case ON public.concierge_case_participants(case_id);
CREATE INDEX IF NOT EXISTS idx_ccp_user ON public.concierge_case_participants(user_id);
DROP TRIGGER IF EXISTS trg_ccp_updated_at ON public.concierge_case_participants;
CREATE TRIGGER trg_ccp_updated_at
  BEFORE UPDATE ON public.concierge_case_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.concierge_case_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL
    CHECK (link_type IN ('travel_plan','request','quote','proposal','order','reservation','business')),
  target_id UUID NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, link_type, target_id)
);
GRANT SELECT ON public.concierge_case_links TO authenticated;
GRANT ALL ON public.concierge_case_links TO service_role;
ALTER TABLE public.concierge_case_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ccl_case ON public.concierge_case_links(case_id);

CREATE TABLE IF NOT EXISTS public.concierge_case_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concierge_case_timeline TO authenticated;
GRANT ALL ON public.concierge_case_timeline TO service_role;
ALTER TABLE public.concierge_case_timeline ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cct_case_time ON public.concierge_case_timeline(case_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.concierge_case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal','internal_lead_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concierge_case_notes TO authenticated;
GRANT ALL ON public.concierge_case_notes TO service_role;
ALTER TABLE public.concierge_case_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ccn_case ON public.concierge_case_notes(case_id);
DROP TRIGGER IF EXISTS trg_ccn_updated_at ON public.concierge_case_notes;
CREATE TRIGGER trg_ccn_updated_at
  BEFORE UPDATE ON public.concierge_case_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpers --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concierge_can_view_case(_case_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.concierge_cases c
    WHERE c.id = _case_id
      AND (
        c.traveler_user_id = _user_id
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'super_admin')
        OR public.has_role(_user_id, 'concierge_lead')
        OR EXISTS (
          SELECT 1 FROM public.concierge_case_participants p
          WHERE p.case_id = c.id AND p.user_id = _user_id AND p.is_active = TRUE
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.concierge_is_internal(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id,'concierge')
      OR public.has_role(_user_id,'concierge_lead')
      OR public.has_role(_user_id,'admin')
      OR public.has_role(_user_id,'super_admin');
$$;

-- RLS Policies (solo lectura; escrituras vía RPCs SECURITY DEFINER) ----
DROP POLICY IF EXISTS "ccases_select" ON public.concierge_cases;
CREATE POLICY "ccases_select" ON public.concierge_cases
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(id, auth.uid()));

DROP POLICY IF EXISTS "ccp_select" ON public.concierge_case_participants;
CREATE POLICY "ccp_select" ON public.concierge_case_participants
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

DROP POLICY IF EXISTS "ccl_select" ON public.concierge_case_links;
CREATE POLICY "ccl_select" ON public.concierge_case_links
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

DROP POLICY IF EXISTS "cct_select" ON public.concierge_case_timeline;
CREATE POLICY "cct_select" ON public.concierge_case_timeline
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

DROP POLICY IF EXISTS "ccn_select" ON public.concierge_case_notes;
CREATE POLICY "ccn_select" ON public.concierge_case_notes
  FOR SELECT TO authenticated
  USING (
    public.concierge_is_internal(auth.uid())
    AND public.concierge_can_view_case(case_id, auth.uid())
    AND (
      visibility = 'internal'
      OR public.has_role(auth.uid(),'concierge_lead')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'super_admin')
    )
  );

-- RPCs base ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concierge_case_create(
  _traveler_user_id UUID,
  _source TEXT DEFAULT 'manual',
  _summary TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_case_id UUID;
  v_lead RECORD;
  v_event_id TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT (public.has_role(v_uid,'concierge_lead')
       OR public.has_role(v_uid,'admin')
       OR public.has_role(v_uid,'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF _traveler_user_id IS NULL THEN
    RAISE EXCEPTION 'traveler_user_id requerido' USING errcode='22023';
  END IF;
  IF _source NOT IN ('travel_plan','marketplace_product','manual') THEN
    RAISE EXCEPTION 'source inválido: %', _source USING errcode='22023';
  END IF;

  INSERT INTO public.concierge_cases (traveler_user_id, source, summary, created_by)
  VALUES (_traveler_user_id, _source, _summary, v_uid)
  RETURNING id INTO v_case_id;

  INSERT INTO public.concierge_case_participants (case_id, user_id, role)
  VALUES (v_case_id, _traveler_user_id, 'traveler')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_case_id, 'Concierge.Case.Created', 'info', v_uid,
          'Expediente creado', jsonb_build_object('source', _source));

  v_event_id := 'concierge.case.created:' || v_case_id::text;

  PERFORM public.unc_publish_in_app(
    v_event_id, 'Concierge.Case.Created', _traveler_user_id, 'traveler',
    'transactional'::public.notification_category,
    jsonb_build_object('case_id', v_case_id, 'source', _source)
  );

  FOR v_lead IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
     WHERE ur.role = 'concierge_lead'
  LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id || ':lead:' || v_lead.user_id::text,
      'Concierge.Case.Created', v_lead.user_id, 'concierge_lead',
      'operational'::public.notification_category,
      jsonb_build_object('case_id', v_case_id, 'source', _source, 'traveler_user_id', _traveler_user_id)
    );
  END LOOP;

  RETURN v_case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_create(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_create(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_get(_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  SELECT jsonb_build_object(
    'case', to_jsonb(c.*),
    'participants', COALESCE((SELECT jsonb_agg(to_jsonb(p.*)) FROM public.concierge_case_participants p WHERE p.case_id = c.id), '[]'::jsonb),
    'links', COALESCE((SELECT jsonb_agg(to_jsonb(l.*)) FROM public.concierge_case_links l WHERE l.case_id = c.id), '[]'::jsonb),
    'timeline', COALESCE((
      SELECT jsonb_agg(t ORDER BY t.occurred_at DESC)
      FROM (SELECT * FROM public.concierge_case_timeline WHERE case_id = c.id ORDER BY occurred_at DESC) t
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.concierge_cases c WHERE c.id = _case_id;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_get(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_get(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_list_for_role(
  _scope TEXT DEFAULT 'traveler',
  _limit INT DEFAULT 50
)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_scope TEXT := lower(coalesce(_scope,'traveler'));
  v_lim INT := greatest(1, least(coalesce(_limit,50), 200));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;

  IF v_scope = 'traveler' THEN
    RETURN QUERY
      SELECT to_jsonb(c.*) FROM public.concierge_cases c
       WHERE c.traveler_user_id = v_uid
       ORDER BY c.updated_at DESC LIMIT v_lim;
  ELSIF v_scope = 'concierge' THEN
    IF NOT public.has_role(v_uid,'concierge') AND NOT public.has_role(v_uid,'concierge_lead') THEN
      RAISE EXCEPTION 'forbidden' USING errcode='42501';
    END IF;
    RETURN QUERY
      SELECT to_jsonb(c.*) FROM public.concierge_cases c
       WHERE EXISTS (
         SELECT 1 FROM public.concierge_case_participants p
          WHERE p.case_id = c.id AND p.user_id = v_uid
            AND p.role IN ('concierge','observer') AND p.is_active = TRUE
       )
       ORDER BY c.updated_at DESC LIMIT v_lim;
  ELSIF v_scope = 'lead' THEN
    IF NOT public.has_role(v_uid,'concierge_lead') AND NOT public.has_role(v_uid,'admin') AND NOT public.has_role(v_uid,'super_admin') THEN
      RAISE EXCEPTION 'forbidden' USING errcode='42501';
    END IF;
    RETURN QUERY
      SELECT to_jsonb(c.*) FROM public.concierge_cases c
       ORDER BY c.updated_at DESC LIMIT v_lim;
  ELSIF v_scope = 'admin' THEN
    IF NOT public.has_role(v_uid,'admin') AND NOT public.has_role(v_uid,'super_admin') THEN
      RAISE EXCEPTION 'forbidden' USING errcode='42501';
    END IF;
    RETURN QUERY
      SELECT to_jsonb(c.*) FROM public.concierge_cases c
       ORDER BY c.updated_at DESC LIMIT v_lim;
  ELSE
    RAISE EXCEPTION 'scope inválido: %', v_scope USING errcode='22023';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_list_for_role(text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_list_for_role(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_set_status(
  _case_id UUID,
  _next_status TEXT,
  _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_current TEXT;
  v_traveler UUID;
  v_allowed BOOLEAN := FALSE;
  v_event_id TEXT;
  v_p RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_is_internal(v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  SELECT status, traveler_user_id INTO v_current, v_traveler
    FROM public.concierge_cases WHERE id = _case_id FOR UPDATE;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'case_not_found' USING errcode='P0002';
  END IF;

  v_allowed := CASE
    WHEN v_current = 'new'               AND _next_status IN ('triaged','archived') THEN TRUE
    WHEN v_current = 'triaged'           AND _next_status IN ('in_progress','archived') THEN TRUE
    WHEN v_current = 'in_progress'       AND _next_status IN ('awaiting_traveler','awaiting_business','closed_won','closed_lost','archived') THEN TRUE
    WHEN v_current = 'awaiting_traveler' AND _next_status IN ('in_progress','closed_lost','archived') THEN TRUE
    WHEN v_current = 'awaiting_business' AND _next_status IN ('in_progress','closed_lost','archived') THEN TRUE
    WHEN v_current IN ('closed_won','closed_lost') AND _next_status = 'archived' THEN TRUE
    ELSE FALSE
  END;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'transición inválida: % -> %', v_current, _next_status USING errcode='22023';
  END IF;

  UPDATE public.concierge_cases SET status = _next_status WHERE id = _case_id;

  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (_case_id, 'Concierge.Case.StatusChanged', 'info', v_uid,
          'Estado: ' || v_current || ' -> ' || _next_status,
          jsonb_build_object('from', v_current, 'to', _next_status, 'reason', _reason));

  v_event_id := 'concierge.case.status:' || _case_id::text || ':' || _next_status;

  PERFORM public.unc_publish_in_app(
    v_event_id, 'Concierge.Case.StatusChanged', v_traveler, 'traveler',
    'transactional'::public.notification_category,
    jsonb_build_object('case_id', _case_id, 'status', _next_status)
  );

  FOR v_p IN
    SELECT DISTINCT p.user_id FROM public.concierge_case_participants p
    WHERE p.case_id = _case_id AND p.is_active = TRUE
      AND p.role IN ('concierge','concierge_lead','observer')
  LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id || ':p:' || v_p.user_id::text,
      'Concierge.Case.StatusChanged', v_p.user_id, 'concierge',
      'operational'::public.notification_category,
      jsonb_build_object('case_id', _case_id, 'status', _next_status)
    );
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_set_status(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_set_status(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.concierge_case_timeline_append(
  _case_id UUID,
  _event_type TEXT,
  _severity TEXT,
  _summary TEXT,
  _payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_is_internal(v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF _severity NOT IN ('info','warning','critical') THEN
    RAISE EXCEPTION 'severity inválida' USING errcode='22023';
  END IF;

  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (_case_id, _event_type, _severity, v_uid, _summary, coalesce(_payload,'{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_timeline_append(uuid, text, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_timeline_append(uuid, text, text, text, jsonb) TO authenticated;
