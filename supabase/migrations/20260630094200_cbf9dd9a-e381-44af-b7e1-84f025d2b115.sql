
-- ============================================================
-- 15.10.4 Fase 2 — Ciclo "Arma tu Viaje" end-to-end
-- cc_* wrappers (contrato público de la Adenda) + evaluación.
-- Toda autorización delega en las RPCs concierge_* ya auditadas.
-- ============================================================

-- 1) Tabla de evaluaciones del ciclo (post-cierre del caso)
CREATE TABLE IF NOT EXISTS public.cc_case_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  traveler_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  nps INTEGER CHECK (nps BETWEEN 0 AND 10),
  comment TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, traveler_user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.cc_case_evaluations TO authenticated;
GRANT ALL ON public.cc_case_evaluations TO service_role;

ALTER TABLE public.cc_case_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_eval_select"
  ON public.cc_case_evaluations FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

CREATE POLICY "cc_eval_insert_self"
  ON public.cc_case_evaluations FOR INSERT TO authenticated
  WITH CHECK (
    traveler_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.concierge_cases c
      WHERE c.id = case_id AND c.traveler_user_id = auth.uid()
    )
  );

CREATE POLICY "cc_eval_update_self"
  ON public.cc_case_evaluations FOR UPDATE TO authenticated
  USING (traveler_user_id = auth.uid())
  WITH CHECK (traveler_user_id = auth.uid());

CREATE TRIGGER trg_cc_eval_updated_at
  BEFORE UPDATE ON public.cc_case_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) cc_* WRAPPERS (contrato público; auditoría y autorización en delegados)
--    Mantenemos las firmas estables que solicita la Adenda 15.10.4.

-- cc_case_create_from_plan: crea solicitud "Arma tu Viaje" para el turista actual
CREATE OR REPLACE FUNCTION public.cc_case_create_from_plan(
  _summary TEXT,
  _items JSONB DEFAULT '[]'::jsonb,
  _travel_plan_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  v_id := public.concierge_case_from_travel_plan(
    _traveler_user_id := v_uid,
    _summary := _summary,
    _items := COALESCE(_items, '[]'::jsonb),
    _travel_plan_id := _travel_plan_id
  );
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.cc_case_create_from_plan(TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_case_create_from_plan(TEXT, JSONB, UUID) TO authenticated;

-- cc_case_assign
CREATE OR REPLACE FUNCTION public.cc_case_assign(
  _case_id UUID, _concierge_user_id UUID, _reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.concierge_case_assign(_case_id, _concierge_user_id, _reason);
END $$;
REVOKE ALL ON FUNCTION public.cc_case_assign(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_case_assign(UUID, UUID, TEXT) TO authenticated;

-- cc_create_proposal
CREATE OR REPLACE FUNCTION public.cc_create_proposal(
  _case_id UUID, _items JSONB,
  _summary TEXT DEFAULT NULL, _terms TEXT DEFAULT NULL,
  _valid_until TIMESTAMPTZ DEFAULT NULL,
  _supersedes_proposal_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.concierge_proposal_create(_case_id, _items, _summary, _terms, _valid_until, _supersedes_proposal_id);
END $$;
REVOKE ALL ON FUNCTION public.cc_create_proposal(UUID, JSONB, TEXT, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_create_proposal(UUID, JSONB, TEXT, TEXT, TIMESTAMPTZ, UUID) TO authenticated;

-- cc_send_proposal
CREATE OR REPLACE FUNCTION public.cc_send_proposal(_proposal_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.concierge_proposal_send(_proposal_id); END $$;
REVOKE ALL ON FUNCTION public.cc_send_proposal(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_send_proposal(UUID) TO authenticated;

-- cc_accept_proposal → crea órdenes (booking)
CREATE OR REPLACE FUNCTION public.cc_accept_proposal(_proposal_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN public.concierge_proposal_accept(_proposal_id); END $$;
REVOKE ALL ON FUNCTION public.cc_accept_proposal(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_accept_proposal(UUID) TO authenticated;

-- cc_reject_proposal
CREATE OR REPLACE FUNCTION public.cc_reject_proposal(_proposal_id UUID, _reason TEXT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.concierge_proposal_reject(_proposal_id, _reason); END $$;
REVOKE ALL ON FUNCTION public.cc_reject_proposal(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_reject_proposal(UUID, TEXT) TO authenticated;

-- cc_quote_request / cc_quote_submit (Empresas)
CREATE OR REPLACE FUNCTION public.cc_quote_request(
  _request_id UUID, _business_id UUID, _valid_for_hours INTEGER DEFAULT 72
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.concierge_quote_request(_request_id, _business_id, _valid_for_hours);
END $$;
REVOKE ALL ON FUNCTION public.cc_quote_request(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_quote_request(UUID, UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.cc_quote_submit(
  _quote_id UUID, _total_amount_cents INTEGER, _currency TEXT DEFAULT 'MXN',
  _notes TEXT DEFAULT NULL, _terms TEXT DEFAULT NULL, _payload JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.concierge_quote_submit(_quote_id, _total_amount_cents, _currency, _notes, _terms, _payload);
END $$;
REVOKE ALL ON FUNCTION public.cc_quote_submit(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_quote_submit(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- cc_case_set_status / cc_timeline_append
CREATE OR REPLACE FUNCTION public.cc_case_set_status(_case_id UUID, _status TEXT, _reason TEXT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.concierge_case_set_status(_case_id, _status, _reason); END $$;
REVOKE ALL ON FUNCTION public.cc_case_set_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_case_set_status(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.cc_timeline_append(
  _case_id UUID, _event_type TEXT, _summary TEXT DEFAULT NULL,
  _payload JSONB DEFAULT '{}'::jsonb, _severity TEXT DEFAULT 'info'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.concierge_case_timeline_append(_case_id, _event_type, _summary, _payload, _severity);
END $$;
REVOKE ALL ON FUNCTION public.cc_timeline_append(UUID, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_timeline_append(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- 3) cc_case_evaluate (post-cierre)
CREATE OR REPLACE FUNCTION public.cc_case_evaluate(
  _case_id UUID, _rating INTEGER, _nps INTEGER DEFAULT NULL,
  _comment TEXT DEFAULT NULL, _payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_case public.concierge_cases; v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating' USING errcode='22023';
  END IF;
  SELECT * INTO v_case FROM public.concierge_cases WHERE id = _case_id;
  IF v_case.id IS NULL THEN RAISE EXCEPTION 'case_not_found' USING errcode='P0002'; END IF;
  IF v_case.traveler_user_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF v_case.status NOT IN ('closed_won','closed_lost','archived') THEN
    RAISE EXCEPTION 'case_not_closed' USING errcode='22023';
  END IF;

  INSERT INTO public.cc_case_evaluations (case_id, traveler_user_id, rating, nps, comment, payload)
  VALUES (_case_id, v_uid, _rating, _nps, _comment, COALESCE(_payload,'{}'::jsonb))
  ON CONFLICT (case_id, traveler_user_id) DO UPDATE
    SET rating = EXCLUDED.rating, nps = EXCLUDED.nps,
        comment = EXCLUDED.comment, payload = EXCLUDED.payload,
        updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.concierge_case_timeline_append(
    _case_id, 'evaluation_submitted',
    'Evaluación del turista registrada',
    jsonb_build_object('rating', _rating, 'nps', _nps),
    'info'
  );
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.cc_case_evaluate(UUID, INTEGER, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_case_evaluate(UUID, INTEGER, INTEGER, TEXT, JSONB) TO authenticated;
