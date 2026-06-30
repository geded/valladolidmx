
-- 14.60.4 — Propuestas Concierge · Payment Lifecycle bridge
-- Idempotente.

-- 1) concierge_proposals
CREATE TABLE IF NOT EXISTS public.concierge_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.concierge_cases(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','accepted','rejected','withdrawn','superseded','expired')),
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_proposal_id UUID REFERENCES public.concierge_proposals(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ,
  summary TEXT,
  terms TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concierge_proposals TO authenticated;
GRANT ALL ON public.concierge_proposals TO service_role;
ALTER TABLE public.concierge_proposals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cp_case ON public.concierge_proposals(case_id);
CREATE INDEX IF NOT EXISTS idx_cp_status_valid_until ON public.concierge_proposals(status, valid_until);

DROP TRIGGER IF EXISTS trg_cp_updated_at ON public.concierge_proposals;
CREATE TRIGGER trg_cp_updated_at
  BEFORE UPDATE ON public.concierge_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "cp_select" ON public.concierge_proposals;
CREATE POLICY "cp_select" ON public.concierge_proposals
  FOR SELECT TO authenticated
  USING (public.concierge_can_view_case(case_id, auth.uid()));

-- 2) concierge_proposal_items
CREATE TABLE IF NOT EXISTS public.concierge_proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.concierge_proposals(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.concierge_quotes(id) ON DELETE RESTRICT,
  request_id UUID NOT NULL REFERENCES public.concierge_case_requests(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, quote_id)
);
GRANT SELECT ON public.concierge_proposal_items TO authenticated;
GRANT ALL ON public.concierge_proposal_items TO service_role;
ALTER TABLE public.concierge_proposal_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cpi_proposal ON public.concierge_proposal_items(proposal_id, position);

DROP TRIGGER IF EXISTS trg_cpi_updated_at ON public.concierge_proposal_items;
CREATE TRIGGER trg_cpi_updated_at
  BEFORE UPDATE ON public.concierge_proposal_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "cpi_select" ON public.concierge_proposal_items;
CREATE POLICY "cpi_select" ON public.concierge_proposal_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.concierge_proposals p
     WHERE p.id = proposal_id
       AND public.concierge_can_view_case(p.case_id, auth.uid())
  ));

-- 3) UNC helpers (audiencia viajero + audiencia empresa por quote)
CREATE OR REPLACE FUNCTION public._concierge_proposal_publish_to_traveler(
  _event_id TEXT, _event_type TEXT, _case_id UUID,
  _category public.notification_category, _payload JSONB,
  _email_template TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_traveler UUID;
BEGIN
  SELECT traveler_user_id INTO v_traveler FROM public.concierge_cases WHERE id = _case_id;
  IF v_traveler IS NULL THEN RETURN; END IF;
  PERFORM public.unc_publish_in_app(
    _event_id || ':tr:' || v_traveler::text,
    _event_type, v_traveler, 'traveler',
    _category, _payload
  );
  IF _email_template IS NOT NULL THEN
    PERFORM public.unc_publish_email(
      _event_id || ':trmail:' || v_traveler::text,
      _event_type, v_traveler, 'traveler',
      _category, _email_template, NULL, _payload
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._concierge_proposal_publish_to_traveler(text, text, uuid, public.notification_category, jsonb, text) FROM public, anon;

-- 4) RPC: create
CREATE OR REPLACE FUNCTION public.concierge_proposal_create(
  _case_id UUID,
  _items JSONB,
  _summary TEXT DEFAULT NULL,
  _terms TEXT DEFAULT NULL,
  _valid_until TIMESTAMPTZ DEFAULT NULL,
  _supersedes_proposal_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pid UUID;
  v_item JSONB;
  v_quote public.concierge_quotes;
  v_total INTEGER := 0;
  v_currency TEXT := 'MXN';
  v_pos INTEGER := 0;
  v_version INTEGER := 1;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  IF NOT public.concierge_is_internal(v_uid) OR NOT public.concierge_can_view_case(_case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'items_required' USING errcode='22023';
  END IF;

  IF _supersedes_proposal_id IS NOT NULL THEN
    SELECT version + 1 INTO v_version FROM public.concierge_proposals
     WHERE id = _supersedes_proposal_id AND case_id = _case_id;
    IF v_version IS NULL THEN
      RAISE EXCEPTION 'supersedes_not_found' USING errcode='P0002';
    END IF;
  END IF;

  INSERT INTO public.concierge_proposals
    (case_id, created_by_user_id, status, version, supersedes_proposal_id,
     summary, terms, valid_until)
  VALUES (_case_id, v_uid, 'draft', v_version, _supersedes_proposal_id,
          _summary, _terms, _valid_until)
  RETURNING id INTO v_pid;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO v_quote FROM public.concierge_quotes
     WHERE id = (v_item->>'quote_id')::uuid AND case_id = _case_id;
    IF v_quote.id IS NULL THEN
      RAISE EXCEPTION 'quote_not_in_case' USING errcode='22023';
    END IF;
    IF v_quote.status <> 'submitted' THEN
      RAISE EXCEPTION 'quote_not_submitted' USING errcode='22023';
    END IF;
    v_currency := v_quote.currency;
    INSERT INTO public.concierge_proposal_items
      (proposal_id, quote_id, request_id, position, amount_cents, currency, notes)
    VALUES (v_pid, v_quote.id, v_quote.request_id, v_pos,
            COALESCE(v_quote.total_amount_cents, 0), v_quote.currency,
            v_item->>'notes');
    v_total := v_total + COALESCE(v_quote.total_amount_cents, 0);
    v_pos := v_pos + 1;
  END LOOP;

  UPDATE public.concierge_proposals
     SET total_amount_cents = v_total, currency = v_currency
   WHERE id = v_pid;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (_case_id, 'Concierge.Proposal.Created', 'info', v_uid,
          'Propuesta creada (borrador)',
          jsonb_build_object('proposal_id', v_pid, 'version', v_version));

  RETURN v_pid;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_create(uuid, jsonb, text, text, timestamptz, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_create(uuid, jsonb, text, text, timestamptz, uuid) TO authenticated;

-- 5) RPC: send
CREATE OR REPLACE FUNCTION public.concierge_proposal_send(_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.concierge_proposals;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  IF NOT public.concierge_is_internal(v_uid) OR NOT public.concierge_can_view_case(v_p.case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF v_p.status <> 'draft' THEN RAISE EXCEPTION 'invalid_state' USING errcode='22023'; END IF;

  UPDATE public.concierge_proposals
     SET status = 'sent', sent_at = now()
   WHERE id = _proposal_id;

  -- Marcar la propuesta previa como superseded
  IF v_p.supersedes_proposal_id IS NOT NULL THEN
    UPDATE public.concierge_proposals
       SET status = 'superseded'
     WHERE id = v_p.supersedes_proposal_id AND status IN ('sent','viewed');
  END IF;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_p.case_id, 'Concierge.Proposal.Sent', 'info', v_uid,
          'Propuesta enviada al viajero',
          jsonb_build_object('proposal_id', _proposal_id));

  PERFORM public._concierge_proposal_publish_to_traveler(
    'concierge.proposal.sent:' || _proposal_id::text,
    'Concierge.Proposal.Sent', v_p.case_id,
    'transactional'::public.notification_category,
    jsonb_build_object('proposal_id', _proposal_id, 'case_id', v_p.case_id,
                       'total_amount_cents', v_p.total_amount_cents,
                       'currency', v_p.currency),
    'concierge.proposal.sent'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_send(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_send(uuid) TO authenticated;

-- 6) RPC: view (idempotente)
CREATE OR REPLACE FUNCTION public.concierge_proposal_view(_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.concierge_proposals;
  v_case public.concierge_cases;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  SELECT * INTO v_case FROM public.concierge_cases WHERE id = v_p.case_id;
  IF v_case.traveler_user_id <> v_uid THEN RETURN; END IF;
  IF v_p.status = 'sent' THEN
    UPDATE public.concierge_proposals
       SET status = 'viewed', viewed_at = now()
     WHERE id = _proposal_id;

    INSERT INTO public.concierge_case_timeline
      (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (v_p.case_id, 'Concierge.Proposal.Viewed', 'info', v_uid,
            'Propuesta vista por el viajero',
            jsonb_build_object('proposal_id', _proposal_id));

    PERFORM public._concierge_quote_publish_to_case_staff(
      'concierge.proposal.viewed:' || _proposal_id::text,
      'Concierge.Proposal.Viewed', v_p.case_id,
      'operational'::public.notification_category,
      jsonb_build_object('proposal_id', _proposal_id),
      NULL
    );
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_view(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_view(uuid) TO authenticated;

-- 7) RPC: accept
CREATE OR REPLACE FUNCTION public.concierge_proposal_accept(_proposal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.concierge_proposals;
  v_case public.concierge_cases;
  v_item RECORD;
  v_quote public.concierge_quotes;
  v_req public.concierge_case_requests;
  v_order_id UUID;
  v_order_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  SELECT * INTO v_case FROM public.concierge_cases WHERE id = v_p.case_id;
  IF v_case.traveler_user_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF v_p.status NOT IN ('sent','viewed') THEN
    RAISE EXCEPTION 'invalid_state' USING errcode='22023';
  END IF;
  IF v_p.valid_until IS NOT NULL AND v_p.valid_until < now() THEN
    RAISE EXCEPTION 'proposal_expired' USING errcode='22023';
  END IF;

  UPDATE public.concierge_proposals
     SET status = 'accepted', responded_at = now()
   WHERE id = _proposal_id;

  FOR v_item IN
    SELECT * FROM public.concierge_proposal_items WHERE proposal_id = _proposal_id ORDER BY position
  LOOP
    SELECT * INTO v_quote FROM public.concierge_quotes WHERE id = v_item.quote_id FOR UPDATE;
    SELECT * INTO v_req FROM public.concierge_case_requests WHERE id = v_item.request_id;

    -- Marcar la cotización como aceptada (sin alterar otras ya enviadas en el mismo request)
    IF v_quote.status = 'submitted' THEN
      UPDATE public.concierge_quotes
         SET status = 'accepted'
       WHERE id = v_quote.id;
    END IF;

    -- Crear orden por empresa/cotización en estado 'pending'
    INSERT INTO public.orders
      (user_id, status, currency, subtotal_amount, total_amount,
       notes, client_request_id, confirmed_at)
    VALUES (v_uid, 'pending', v_quote.currency,
            ROUND(COALESCE(v_quote.total_amount_cents,0)::numeric/100.0, 2),
            ROUND(COALESCE(v_quote.total_amount_cents,0)::numeric/100.0, 2),
            'Concierge proposal ' || _proposal_id::text || ' · quote ' || v_quote.id::text,
            'concierge:' || _proposal_id::text || ':' || v_quote.id::text,
            now())
    RETURNING id INTO v_order_id;

    -- Si la solicitud referenciaba un producto del Marketplace, registrar item
    IF v_req.product_id IS NOT NULL THEN
      INSERT INTO public.order_items
        (order_id, product_id, business_id, quantity, unit_price, currency,
         snapshot_name, snapshot_slug)
      SELECT v_order_id, p.id, v_quote.business_id, 1,
             ROUND(COALESCE(v_quote.total_amount_cents,0)::numeric/100.0, 2),
             v_quote.currency, p.name, p.slug
        FROM public.products p WHERE p.id = v_req.product_id
       ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.concierge_case_links (case_id, link_type, target_id, meta)
    VALUES (v_p.case_id, 'order', v_order_id,
            jsonb_build_object('proposal_id', _proposal_id, 'quote_id', v_quote.id))
    ON CONFLICT DO NOTHING;

    v_order_ids := array_append(v_order_ids, v_order_id);

    -- Evento por cotización aceptada
    INSERT INTO public.concierge_case_timeline
      (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (v_p.case_id, 'Concierge.Quote.Accepted', 'info', v_uid,
            'Cotización aceptada',
            jsonb_build_object('quote_id', v_quote.id, 'order_id', v_order_id,
                               'business_id', v_quote.business_id));

    PERFORM public._concierge_quote_publish_to_business(
      'concierge.quote.accepted:' || v_quote.id::text,
      'Concierge.Quote.Accepted', v_quote.business_id,
      'transactional'::public.notification_category,
      jsonb_build_object('quote_id', v_quote.id, 'order_id', v_order_id,
                         'proposal_id', _proposal_id),
      'concierge.quote.accepted'
    );
  END LOOP;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_p.case_id, 'Concierge.Proposal.Accepted', 'info', v_uid,
          'Propuesta aceptada por el viajero',
          jsonb_build_object('proposal_id', _proposal_id, 'order_ids', to_jsonb(v_order_ids)));

  PERFORM public._concierge_quote_publish_to_case_staff(
    'concierge.proposal.accepted:' || _proposal_id::text,
    'Concierge.Proposal.Accepted', v_p.case_id,
    'transactional'::public.notification_category,
    jsonb_build_object('proposal_id', _proposal_id, 'order_ids', to_jsonb(v_order_ids)),
    'concierge.proposal.accepted'
  );

  RETURN jsonb_build_object('proposal_id', _proposal_id, 'order_ids', to_jsonb(v_order_ids));
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_accept(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_accept(uuid) TO authenticated;

-- 8) RPC: reject
CREATE OR REPLACE FUNCTION public.concierge_proposal_reject(
  _proposal_id UUID, _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.concierge_proposals;
  v_case public.concierge_cases;
  v_item RECORD;
  v_quote public.concierge_quotes;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  SELECT * INTO v_case FROM public.concierge_cases WHERE id = v_p.case_id;
  IF v_case.traveler_user_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF v_p.status NOT IN ('sent','viewed') THEN
    RAISE EXCEPTION 'invalid_state' USING errcode='22023';
  END IF;

  UPDATE public.concierge_proposals
     SET status = 'rejected', responded_at = now(),
         payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('reject_reason', _reason)
   WHERE id = _proposal_id;

  FOR v_item IN
    SELECT * FROM public.concierge_proposal_items WHERE proposal_id = _proposal_id
  LOOP
    SELECT * INTO v_quote FROM public.concierge_quotes WHERE id = v_item.quote_id;
    -- No mutamos el estado canónico de la cotización; emitimos evento informativo
    INSERT INTO public.concierge_case_timeline
      (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (v_p.case_id, 'Concierge.Quote.Rejected', 'info', v_uid,
            'Cotización descartada en propuesta rechazada',
            jsonb_build_object('quote_id', v_quote.id, 'proposal_id', _proposal_id));

    PERFORM public._concierge_quote_publish_to_business(
      'concierge.quote.rejected:' || v_quote.id::text || ':' || _proposal_id::text,
      'Concierge.Quote.Rejected', v_quote.business_id,
      'operational'::public.notification_category,
      jsonb_build_object('quote_id', v_quote.id, 'proposal_id', _proposal_id),
      NULL
    );
  END LOOP;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_p.case_id, 'Concierge.Proposal.Rejected', 'info', v_uid,
          'Propuesta rechazada por el viajero',
          jsonb_build_object('proposal_id', _proposal_id, 'reason', _reason));

  PERFORM public._concierge_quote_publish_to_case_staff(
    'concierge.proposal.rejected:' || _proposal_id::text,
    'Concierge.Proposal.Rejected', v_p.case_id,
    'transactional'::public.notification_category,
    jsonb_build_object('proposal_id', _proposal_id, 'reason', _reason),
    'concierge.proposal.rejected'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_reject(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_reject(uuid, text) TO authenticated;

-- 9) RPC: withdraw
CREATE OR REPLACE FUNCTION public.concierge_proposal_withdraw(
  _proposal_id UUID, _reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.concierge_proposals;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  IF NOT public.concierge_is_internal(v_uid) OR NOT public.concierge_can_view_case(v_p.case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;
  IF v_p.status NOT IN ('draft','sent','viewed') THEN
    RAISE EXCEPTION 'invalid_state' USING errcode='22023';
  END IF;

  UPDATE public.concierge_proposals
     SET status = 'withdrawn',
         payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('withdraw_reason', _reason)
   WHERE id = _proposal_id;

  INSERT INTO public.concierge_case_timeline
    (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (v_p.case_id, 'Concierge.Proposal.Withdrawn', 'info', v_uid,
          'Propuesta retirada',
          jsonb_build_object('proposal_id', _proposal_id, 'reason', _reason));

  PERFORM public._concierge_proposal_publish_to_traveler(
    'concierge.proposal.withdrawn:' || _proposal_id::text,
    'Concierge.Proposal.Withdrawn', v_p.case_id,
    'operational'::public.notification_category,
    jsonb_build_object('proposal_id', _proposal_id, 'reason', _reason),
    NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_withdraw(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_withdraw(uuid, text) TO authenticated;

-- 10) RPC: supersede (atajo create + send con supersedes)
CREATE OR REPLACE FUNCTION public.concierge_proposal_supersede(
  _proposal_id UUID,
  _new_items JSONB,
  _summary TEXT DEFAULT NULL,
  _terms TEXT DEFAULT NULL,
  _valid_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_p public.concierge_proposals;
  v_new UUID;
BEGIN
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  v_new := public.concierge_proposal_create(
    v_p.case_id, _new_items, _summary, _terms, _valid_until, _proposal_id
  );
  PERFORM public.concierge_proposal_send(v_new);
  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_supersede(uuid, jsonb, text, text, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_supersede(uuid, jsonb, text, text, timestamptz) TO authenticated;

-- 11) RPC: expire_due (pg_cron)
CREATE OR REPLACE FUNCTION public.concierge_proposal_expire_due()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_p RECORD;
BEGIN
  FOR v_p IN
    SELECT id, case_id FROM public.concierge_proposals
     WHERE status IN ('sent','viewed')
       AND valid_until IS NOT NULL
       AND valid_until < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.concierge_proposals
       SET status = 'expired', responded_at = now()
     WHERE id = v_p.id;

    INSERT INTO public.concierge_case_timeline
      (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (v_p.case_id, 'Concierge.Proposal.Expired', 'info', NULL,
            'Propuesta expirada',
            jsonb_build_object('proposal_id', v_p.id));

    PERFORM public._concierge_proposal_publish_to_traveler(
      'concierge.proposal.expired:' || v_p.id::text,
      'Concierge.Proposal.Expired', v_p.case_id,
      'operational'::public.notification_category,
      jsonb_build_object('proposal_id', v_p.id),
      NULL
    );
    PERFORM public._concierge_quote_publish_to_case_staff(
      'concierge.proposal.expired:' || v_p.id::text,
      'Concierge.Proposal.Expired', v_p.case_id,
      'operational'::public.notification_category,
      jsonb_build_object('proposal_id', v_p.id),
      NULL
    );

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_expire_due() FROM public, anon;

-- 12) RPC: list per case
CREATE OR REPLACE FUNCTION public.concierge_case_proposals_list(_case_id UUID)
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
    'proposal_id', p.id,
    'status', p.status,
    'version', p.version,
    'supersedes_proposal_id', p.supersedes_proposal_id,
    'currency', p.currency,
    'total_amount_cents', p.total_amount_cents,
    'valid_until', p.valid_until,
    'summary', p.summary,
    'terms', p.terms,
    'sent_at', p.sent_at,
    'viewed_at', p.viewed_at,
    'responded_at', p.responded_at,
    'created_at', p.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'quote_id', i.quote_id,
        'request_id', i.request_id,
        'position', i.position,
        'amount_cents', i.amount_cents,
        'currency', i.currency,
        'notes', i.notes,
        'business_id', q.business_id,
        'business_name', b.display_name,
        'request_title', r.title
      ) ORDER BY i.position)
      FROM public.concierge_proposal_items i
      JOIN public.concierge_quotes q ON q.id = i.quote_id
      LEFT JOIN public.businesses b ON b.id = q.business_id
      JOIN public.concierge_case_requests r ON r.id = i.request_id
      WHERE i.proposal_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.concierge_proposals p
  WHERE p.case_id = _case_id
  ORDER BY p.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_case_proposals_list(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_case_proposals_list(uuid) TO authenticated;

-- 13) RPC: proposal_get (single)
CREATE OR REPLACE FUNCTION public.concierge_proposal_get(_proposal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_p public.concierge_proposals;
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode='42501'; END IF;
  SELECT * INTO v_p FROM public.concierge_proposals WHERE id = _proposal_id;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'proposal_not_found' USING errcode='P0002'; END IF;
  IF NOT public.concierge_can_view_case(v_p.case_id, v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING errcode='42501';
  END IF;

  SELECT q INTO v_result FROM public.concierge_case_proposals_list(v_p.case_id) q
   WHERE (q->>'proposal_id')::uuid = _proposal_id;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.concierge_proposal_get(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.concierge_proposal_get(uuid) TO authenticated;

-- 14) concierge_case_file_v1 — incorpora proposals
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
  v_proposals JSONB;
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

  SELECT COALESCE(jsonb_agg(p ORDER BY (p->>'created_at') DESC), '[]'::jsonb)
    INTO v_proposals
    FROM public.concierge_case_proposals_list(_case_id) p;

  v_result := jsonb_build_object(
    'case', to_jsonb(v_case),
    'viewer', jsonb_build_object('user_id', v_uid, 'is_internal', v_internal),
    'traveler', COALESCE(v_traveler, jsonb_build_object('user_id', v_case.traveler_user_id)),
    'travel_plan', CASE WHEN v_travel_plan_id IS NOT NULL
                         THEN jsonb_build_object('id', v_travel_plan_id) ELSE NULL END,
    'requests', v_requests,
    'quotes', v_quotes,
    'proposals', v_proposals,
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

-- 15) pg_cron: expirar propuestas cada 10 minutos
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(j.jobid)
      FROM cron.job j
     WHERE j.jobname = 'concierge-proposal-expire-due';
    PERFORM cron.schedule(
      'concierge-proposal-expire-due',
      '*/10 * * * *',
      $cron$ SELECT public.concierge_proposal_expire_due(); $cron$
    );
  END IF;
END;
$$;
