
-- 14.60.3 — Solicitudes y Cotizaciones con Portal Empresarial
-- Idempotente.

-- 1) Tabla concierge_quotes
CREATE TABLE IF NOT EXISTS public.concierge_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.concierge_case_requests(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  submitted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','submitted','withdrawn','accepted','rejected','expired')),
  currency TEXT NOT NULL DEFAULT 'MXN',
  total_amount_cents INTEGER,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  terms TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ
);

GRANT SELECT ON public.concierge_quotes TO authenticated;
GRANT ALL ON public.concierge_quotes TO service_role;
ALTER TABLE public.concierge_quotes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cq_case ON public.concierge_quotes(case_id);
CREATE INDEX IF NOT EXISTS idx_cq_business_status ON public.concierge_quotes(business_id, status);
CREATE INDEX IF NOT EXISTS idx_cq_status_valid_until ON public.concierge_quotes(status, valid_until);

DROP TRIGGER IF EXISTS trg_cq_updated_at ON public.concierge_quotes;
CREATE TRIGGER trg_cq_updated_at
  BEFORE UPDATE ON public.concierge_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "cq_select" ON public.concierge_quotes;
CREATE POLICY "cq_select" ON public.concierge_quotes
  FOR SELECT TO authenticated
  USING (
    public.concierge_can_view_case(case_id, auth.uid())
    OR public.has_business_access(auth.uid(), business_id, 'viewer')
  );

-- 2) Helpers UNC: publicar eventos a audiencias
CREATE OR REPLACE FUNCTION public._concierge_quote_publish_to_business(
  _event_id TEXT, _event_type TEXT, _business_id UUID,
  _category public.notification_category, _payload JSONB,
  _email_template TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_member RECORD;
BEGIN
  FOR v_member IN
    SELECT DISTINCT user_id FROM public.business_users
     WHERE business_id = _business_id AND status = 'active'
  LOOP
    PERFORM public.unc_publish_in_app(
      _event_id || ':biz:' || v_member.user_id::text,
      _event_type, v_member.user_id, 'business',
      _category, _payload
    );
    IF _email_template IS NOT NULL THEN
      PERFORM public.unc_publish_email(
        _event_id || ':bizmail:' || v_member.user_id::text,
        _event_type, v_member.user_id, 'business',
        _category, _email_template, NULL, _payload
      );
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public._concierge_quote_publish_to_business(text, text, uuid, public.notification_category, jsonb, text) FROM public, anon;

CREATE OR REPLACE FUNCTION public._concierge_quote_publish_to_case_staff(
  _event_id TEXT, _event_type TEXT, _case_id UUID,
  _category public.notification_category, _payload JSONB,
  _email_template TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT DISTINCT user_id FROM public.concierge_case_participants
     WHERE case_id = _case_id
       AND role IN ('concierge','lead','observer')
    UNION
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
     WHERE ur.role = 'concierge_lead'
  LOOP
    PERFORM public.unc_publish_in_app(
      _event_id || ':staff:' || v_user.user_id::text,
      _event_type, v_user.user_id, 'concierge',
      _category, _payload
    );
    IF _email_template IS NOT NULL THEN
      PERFORM public.unc_publish_email(
        _event_id || ':staffmail:' || v_user.user_id::text,
        _event_type, v_user.user_id, 'concierge',
        _category, _email_template, NULL, _payload
      );
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public._concierge_quote_publish_to_case_staff(text, text, uuid, public.notification_category, jsonb, text) FROM public, anon;

-- 3) RPC: concierge_quote_request
CREATE OR REPLACE FUNCTION public.concierge_quote_request(
  _request_id UUID,
  _business_id UUID,
  _valid_for_hours INTEGER DEFAULT 72
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_case_id UUID;
  v_quote_id UUID;
  v_valid TIMESTAMPTZ;
  v_req_title TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF _request_id IS NULL OR _business_id IS NULL THEN
    RAISE EXCEPTION 'request_id y business_id requeridos' USING errcode='22023';
  END IF;

  SELECT r.case_id, r.title INTO v_case_id, v_req_title
    FROM public.concierge_case_requests r WHERE r.id = _request_id;
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'request_not_found' USING errcode='P0002';
  END IF;

  -- Autorización: concierge / lead / admin del expediente
  IF NOT public.concierge_is_internal(v_uid)
     OR NOT public.concierge_can_view_case(v_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  v_valid := now() + make_interval(hours => GREATEST(COALESCE(_valid_for_hours, 72), 1));

  INSERT INTO public.concierge_quotes
    (request_id, case_id, business_id, status, valid_until)
  VALUES (_request_id, v_case_id, _business_id, 'requested', v_valid)
  RETURNING id INTO v_quote_id;

  UPDATE public.concierge_case_requests
     SET status = CASE WHEN status IN ('open') THEN 'quoting' ELSE status END
   WHERE id = _request_id;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_case_id, 'Concierge.Quote.Requested', 'info', v_uid,
          'Cotización solicitada a empresa',
          jsonb_build_object('quote_id', v_quote_id, 'request_id', _request_id,
                             'business_id', _business_id, 'valid_until', v_valid));

  PERFORM public._concierge_quote_publish_to_business(
    'concierge.quote.requested:' || v_quote_id::text,
    'Concierge.Quote.Requested', _business_id,
    'transactional'::public.notification_category,
    jsonb_build_object('quote_id', v_quote_id, 'request_id', _request_id,
                       'business_id', _business_id, 'title', v_req_title,
                       'valid_until', v_valid),
    'concierge.quote.requested'
  );

  RETURN v_quote_id;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_quote_request(uuid, uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_quote_request(uuid, uuid, integer) TO authenticated;

-- 4) RPC: concierge_quote_submit
CREATE OR REPLACE FUNCTION public.concierge_quote_submit(
  _quote_id UUID,
  _total_amount_cents INTEGER,
  _currency TEXT DEFAULT 'MXN',
  _notes TEXT DEFAULT NULL,
  _terms TEXT DEFAULT NULL,
  _payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q public.concierge_quotes;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_q FROM public.concierge_quotes WHERE id = _quote_id FOR UPDATE;
  IF v_q.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING errcode='P0002'; END IF;

  IF NOT public.has_business_access(v_uid, v_q.business_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  IF v_q.status <> 'requested' THEN
    RAISE EXCEPTION 'invalid_state' USING errcode='22023';
  END IF;
  IF v_q.valid_until IS NOT NULL AND v_q.valid_until < now() THEN
    RAISE EXCEPTION 'quote_expired' USING errcode='22023';
  END IF;
  IF _total_amount_cents IS NULL OR _total_amount_cents < 0 THEN
    RAISE EXCEPTION 'total_amount_cents requerido' USING errcode='22023';
  END IF;

  UPDATE public.concierge_quotes
     SET status = 'submitted',
         total_amount_cents = _total_amount_cents,
         currency = COALESCE(NULLIF(_currency, ''), currency),
         notes = _notes,
         terms = _terms,
         payload = COALESCE(_payload, '{}'::jsonb),
         submitted_by_user_id = v_uid,
         submitted_at = now()
   WHERE id = _quote_id;

  UPDATE public.concierge_case_requests
     SET status = 'quoted'
   WHERE id = v_q.request_id AND status IN ('open','quoting');

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_q.case_id, 'Concierge.Quote.Submitted', 'info', v_uid,
          'Cotización recibida',
          jsonb_build_object('quote_id', _quote_id, 'business_id', v_q.business_id,
                             'total_amount_cents', _total_amount_cents, 'currency', _currency));

  PERFORM public._concierge_quote_publish_to_case_staff(
    'concierge.quote.submitted:' || _quote_id::text,
    'Concierge.Quote.Submitted', v_q.case_id,
    'operational'::public.notification_category,
    jsonb_build_object('quote_id', _quote_id, 'case_id', v_q.case_id,
                       'business_id', v_q.business_id,
                       'total_amount_cents', _total_amount_cents,
                       'currency', _currency),
    'concierge.quote.submitted'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_quote_submit(uuid, integer, text, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_quote_submit(uuid, integer, text, text, text, jsonb) TO authenticated;

-- 5) RPC: concierge_quote_withdraw
CREATE OR REPLACE FUNCTION public.concierge_quote_withdraw(
  _quote_id UUID, _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q public.concierge_quotes;
  v_remaining INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_q FROM public.concierge_quotes WHERE id = _quote_id FOR UPDATE;
  IF v_q.id IS NULL THEN RAISE EXCEPTION 'quote_not_found' USING errcode='P0002'; END IF;

  IF NOT (public.has_business_access(v_uid, v_q.business_id, 'editor')
          OR public.is_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  IF v_q.status NOT IN ('requested','submitted') THEN
    RAISE EXCEPTION 'invalid_state' USING errcode='22023';
  END IF;

  UPDATE public.concierge_quotes
     SET status = 'withdrawn',
         payload = COALESCE(payload, '{}'::jsonb)
                   || jsonb_build_object('withdrawn_reason', _reason,
                                         'withdrawn_at', now()::text)
   WHERE id = _quote_id;

  -- Si no quedan cotizaciones activas, devolver request a 'open'
  SELECT count(*) INTO v_remaining FROM public.concierge_quotes
   WHERE request_id = v_q.request_id
     AND status IN ('requested','submitted','accepted');
  IF v_remaining = 0 THEN
    UPDATE public.concierge_case_requests
       SET status = 'open'
     WHERE id = v_q.request_id AND status IN ('quoting','quoted');
  END IF;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_q.case_id, 'Concierge.Quote.Withdrawn', 'info', v_uid,
          'Cotización retirada',
          jsonb_build_object('quote_id', _quote_id, 'reason', _reason));

  PERFORM public._concierge_quote_publish_to_case_staff(
    'concierge.quote.withdrawn:' || _quote_id::text,
    'Concierge.Quote.Withdrawn', v_q.case_id,
    'operational'::public.notification_category,
    jsonb_build_object('quote_id', _quote_id, 'business_id', v_q.business_id,
                       'reason', _reason),
    NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_quote_withdraw(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_quote_withdraw(uuid, text) TO authenticated;

-- 6) RPC: concierge_quote_expire_due (pg_cron)
CREATE OR REPLACE FUNCTION public.concierge_quote_expire_due()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_q RECORD;
  v_remaining INTEGER;
BEGIN
  FOR v_q IN
    SELECT id, case_id, business_id, request_id
      FROM public.concierge_quotes
     WHERE status IN ('requested','submitted')
       AND valid_until IS NOT NULL
       AND valid_until < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.concierge_quotes
       SET status = 'expired', expired_at = now()
     WHERE id = v_q.id;

    INSERT INTO public.concierge_case_timeline
      (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (v_q.case_id, 'Concierge.Quote.Expired', 'info', NULL,
            'Cotización expirada',
            jsonb_build_object('quote_id', v_q.id, 'business_id', v_q.business_id));

    PERFORM public._concierge_quote_publish_to_business(
      'concierge.quote.expired:' || v_q.id::text,
      'Concierge.Quote.Expired', v_q.business_id,
      'operational'::public.notification_category,
      jsonb_build_object('quote_id', v_q.id, 'request_id', v_q.request_id),
      NULL
    );
    PERFORM public._concierge_quote_publish_to_case_staff(
      'concierge.quote.expired:' || v_q.id::text,
      'Concierge.Quote.Expired', v_q.case_id,
      'operational'::public.notification_category,
      jsonb_build_object('quote_id', v_q.id, 'business_id', v_q.business_id),
      NULL
    );

    SELECT count(*) INTO v_remaining FROM public.concierge_quotes
     WHERE request_id = v_q.request_id
       AND status IN ('requested','submitted','accepted');
    IF v_remaining = 0 THEN
      UPDATE public.concierge_case_requests
         SET status = 'open'
       WHERE id = v_q.request_id AND status IN ('quoting','quoted');
    END IF;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_quote_expire_due() FROM public, anon;
-- Sin GRANT a authenticated: ejecutado por pg_cron / service_role.

-- 7) RPC: concierge_quotes_list_for_business
CREATE OR REPLACE FUNCTION public.concierge_quotes_list_for_business(
  _business_id UUID,
  _scope TEXT DEFAULT 'open',
  _limit INTEGER DEFAULT 50
)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.has_business_access(v_uid, _business_id, 'viewer') THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'quote_id', q.id,
    'request_id', q.request_id,
    'status', q.status,
    'currency', q.currency,
    'total_amount_cents', q.total_amount_cents,
    'valid_until', q.valid_until,
    'submitted_at', q.submitted_at,
    'expired_at', q.expired_at,
    'created_at', q.created_at,
    'notes', q.notes,
    'terms', q.terms,
    'request', jsonb_build_object(
      'id', r.id,
      'title', r.title,
      'kind', r.kind,
      'product_id', r.product_id,
      'notes', r.notes
    )
  )
  FROM public.concierge_quotes q
  JOIN public.concierge_case_requests r ON r.id = q.request_id
  WHERE q.business_id = _business_id
    AND (
      (_scope = 'open' AND q.status = 'requested')
      OR (_scope = 'submitted' AND q.status = 'submitted')
      OR (_scope = 'historical' AND q.status IN ('withdrawn','accepted','rejected','expired'))
      OR (_scope = 'all')
    )
  ORDER BY q.created_at DESC
  LIMIT COALESCE(_limit, 50);
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_quotes_list_for_business(uuid, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_quotes_list_for_business(uuid, text, integer) TO authenticated;

-- 8) RPC: concierge_case_quotes_list
CREATE OR REPLACE FUNCTION public.concierge_case_quotes_list(_case_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'quote_id', q.id,
    'request_id', q.request_id,
    'business_id', q.business_id,
    'business_name', b.display_name,
    'status', q.status,
    'currency', q.currency,
    'total_amount_cents', q.total_amount_cents,
    'valid_until', q.valid_until,
    'submitted_at', q.submitted_at,
    'expired_at', q.expired_at,
    'created_at', q.created_at,
    'notes', q.notes,
    'terms', q.terms,
    'request_title', r.title,
    'request_kind', r.kind
  )
  FROM public.concierge_quotes q
  JOIN public.concierge_case_requests r ON r.id = q.request_id
  LEFT JOIN public.businesses b ON b.id = q.business_id
  WHERE q.case_id = _case_id
  ORDER BY q.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_quotes_list(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_quotes_list(uuid) TO authenticated;

-- 9) Actualizar concierge_case_file_v1 para incluir 'quotes'
CREATE OR REPLACE FUNCTION public.concierge_case_file_v1(_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_internal BOOLEAN;
  v_case public.concierge_cases;
  v_result JSONB;
  v_traveler JSONB;
  v_requests JSONB;
  v_links JSONB;
  v_timeline JSONB;
  v_businesses JSONB;
  v_quotes JSONB;
  v_travel_plan_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  v_internal := public.concierge_is_internal(v_uid);

  SELECT * INTO v_case FROM public.concierge_cases WHERE id = _case_id;

  SELECT jsonb_build_object(
    'user_id', tp.user_id,
    'display_name', tp.display_name,
    'preferred_language', tp.preferred_language
  ) INTO v_traveler
  FROM public.traveler_profiles tp WHERE tp.user_id = v_case.traveler_user_id;

  SELECT target_id INTO v_travel_plan_id
  FROM public.concierge_case_links
  WHERE case_id = _case_id AND link_type = 'travel_plan' LIMIT 1;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at), '[]'::jsonb)
    INTO v_requests
    FROM public.concierge_case_requests r WHERE r.case_id = _case_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb)
    INTO v_links
    FROM public.concierge_case_links l WHERE l.case_id = _case_id;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.occurred_at DESC), '[]'::jsonb)
    INTO v_timeline
    FROM (
      SELECT * FROM public.concierge_case_timeline
      WHERE case_id = _case_id ORDER BY occurred_at DESC LIMIT 100
    ) t;

  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', b.id, 'display_name', b.display_name, 'slug', b.slug
  )), '[]'::jsonb)
    INTO v_businesses
    FROM public.businesses b
   WHERE b.id IN (
     SELECT business_id FROM public.concierge_case_requests
      WHERE case_id = _case_id AND business_id IS NOT NULL
     UNION
     SELECT target_id FROM public.concierge_case_links
      WHERE case_id = _case_id AND link_type = 'business'
   );

  SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'created_at') DESC), '[]'::jsonb)
    INTO v_quotes
    FROM public.concierge_case_quotes_list(_case_id) q;

  v_result := jsonb_build_object(
    'case', to_jsonb(v_case),
    'viewer', jsonb_build_object('user_id', v_uid, 'is_internal', v_internal),
    'traveler', COALESCE(v_traveler, jsonb_build_object('user_id', v_case.traveler_user_id)),
    'travel_plan', CASE WHEN v_travel_plan_id IS NOT NULL
                         THEN jsonb_build_object('id', v_travel_plan_id) ELSE NULL END,
    'requests', v_requests,
    'quotes', v_quotes,
    'proposals', '[]'::jsonb,
    'orders', '[]'::jsonb,
    'reservations', '[]'::jsonb,
    'payments', '[]'::jsonb,
    'links', v_links,
    'businesses', v_businesses,
    'timeline', v_timeline
  );

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_file_v1(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_file_v1(uuid) TO authenticated;

-- 10) pg_cron: expirar cotizaciones cada 5 minutos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(j.jobid)
      FROM cron.job j
     WHERE j.jobname = 'concierge-quote-expire-due';
    PERFORM cron.schedule(
      'concierge-quote-expire-due',
      '*/5 * * * *',
      $cron$ SELECT public.concierge_quote_expire_due(); $cron$
    );
  END IF;
END;
$$;
