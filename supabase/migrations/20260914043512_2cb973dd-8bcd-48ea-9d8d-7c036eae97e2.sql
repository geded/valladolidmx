ALTER TABLE public.concierge_proposal_items
  ALTER COLUMN quote_id DROP NOT NULL,
  ALTER COLUMN request_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS title TEXT;

CREATE OR REPLACE FUNCTION public.concierge_proposal_create(_case_id uuid, _items jsonb, _summary text DEFAULT NULL::text, _terms text DEFAULT NULL::text, _valid_until timestamp with time zone DEFAULT NULL::timestamp with time zone, _supersedes_proposal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_pid UUID;
  v_item JSONB;
  v_quote public.concierge_quotes;
  v_total INTEGER := 0;
  v_currency TEXT := 'MXN';
  v_pos INTEGER := 0;
  v_version INTEGER := 1;
  v_title TEXT;
  v_amount INTEGER;
  v_item_currency TEXT;
  v_request_id UUID;
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
    IF NULLIF(v_item->>'quote_id','') IS NOT NULL THEN
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
        (proposal_id, quote_id, request_id, position, amount_cents, currency, notes, title)
      VALUES (v_pid, v_quote.id, v_quote.request_id, v_pos,
              COALESCE(v_quote.total_amount_cents, 0), v_quote.currency,
              v_item->>'notes', NULLIF(v_item->>'title',''));
      v_total := v_total + COALESCE(v_quote.total_amount_cents, 0);
    ELSE
      v_title := NULLIF(btrim(COALESCE(v_item->>'title','')), '');
      IF v_title IS NULL THEN
        RAISE EXCEPTION 'item_title_required' USING errcode='22023';
      END IF;
      v_amount := COALESCE((v_item->>'amount_cents')::integer, 0);
      IF v_amount < 0 THEN
        RAISE EXCEPTION 'item_amount_invalid' USING errcode='22023';
      END IF;
      v_item_currency := COALESCE(NULLIF(v_item->>'currency',''), 'MXN');
      v_request_id := NULL;
      IF NULLIF(v_item->>'request_id','') IS NOT NULL THEN
        SELECT id INTO v_request_id FROM public.concierge_case_requests
         WHERE id = (v_item->>'request_id')::uuid AND case_id = _case_id;
      END IF;
      v_currency := v_item_currency;
      INSERT INTO public.concierge_proposal_items
        (proposal_id, quote_id, request_id, position, amount_cents, currency, notes, title)
      VALUES (v_pid, NULL, v_request_id, v_pos, v_amount, v_item_currency,
              NULLIF(v_item->>'notes',''), v_title);
      v_total := v_total + v_amount;
    END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.concierge_case_proposals_list(_case_id uuid)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'request_title', COALESCE(i.title, r.title, 'Servicio del itinerario')
      ) ORDER BY i.position)
      FROM public.concierge_proposal_items i
      LEFT JOIN public.concierge_quotes q ON q.id = i.quote_id
      LEFT JOIN public.businesses b ON b.id = q.business_id
      LEFT JOIN public.concierge_case_requests r ON r.id = i.request_id
      WHERE i.proposal_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.concierge_proposals p
  WHERE p.case_id = _case_id
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.concierge_create_order_from_proposal(_proposal_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_proposal record;
  v_case record;
  v_existing_order_id uuid;
  v_order_id uuid;
  v_item record;
  v_is_ops boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida';
  END IF;

  SELECT * INTO v_proposal FROM public.concierge_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Propuesta no encontrada'; END IF;

  SELECT * INTO v_case FROM public.concierge_cases WHERE id = v_proposal.case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caso no encontrado'; END IF;

  v_is_ops :=
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'concierge')
    OR public.has_role(v_uid, 'concierge_lead');

  IF v_case.traveler_user_id <> v_uid AND NOT v_is_ops THEN
    RAISE EXCEPTION 'No autorizado para confirmar esta propuesta';
  END IF;

  IF v_proposal.status NOT IN ('sent','viewed','accepted') THEN
    RAISE EXCEPTION 'La propuesta no esta disponible para confirmacion (estado=%)', v_proposal.status;
  END IF;

  SELECT id INTO v_existing_order_id
  FROM public.concierge_orders
  WHERE source_proposal_id = _proposal_id
    AND status NOT IN ('cancelled','expired','refunded')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN v_existing_order_id;
  END IF;

  INSERT INTO public.concierge_orders (
    user_id, source_kind, source_proposal_id, source_case_id,
    currency, status, editorial_title, editorial_summary, created_by
  )
  VALUES (
    v_case.traveler_user_id, 'concierge_proposal', v_proposal.id, v_case.id,
    COALESCE(v_proposal.currency, 'MXN'), 'awaiting_payment',
    COALESCE(v_case.title, 'Tu viaje en el Oriente Maya'),
    v_proposal.summary, v_uid
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT
      pi.amount_cents, pi.currency, pi.notes, pi.position,
      COALESCE(pi.title, cr.title, 'Servicio del itinerario') AS request_title,
      cr.product_id,
      cq.business_id
    FROM public.concierge_proposal_items pi
    LEFT JOIN public.concierge_quotes cq        ON cq.id = pi.quote_id
    LEFT JOIN public.concierge_case_requests cr ON cr.id = pi.request_id
    WHERE pi.proposal_id = _proposal_id
    ORDER BY pi.position
  LOOP
    INSERT INTO public.concierge_order_items (
      order_id, entity_kind, entity_id, business_id,
      title, description, quantity, unit_amount, currency,
      commission_bps, commission_source
    ) VALUES (
      v_order_id,
      CASE WHEN v_item.product_id IS NOT NULL THEN 'product' ELSE 'custom' END,
      v_item.product_id, v_item.business_id,
      v_item.request_title, v_item.notes,
      1, v_item.amount_cents, COALESCE(v_item.currency, 'MXN'),
      1000, 'concierge'
    );
  END LOOP;

  UPDATE public.concierge_proposals
     SET status = 'accepted',
         responded_at = COALESCE(responded_at, now()),
         updated_at = now()
   WHERE id = _proposal_id AND status <> 'accepted';

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'created_from_proposal', v_uid,
          jsonb_build_object('proposal_id', _proposal_id, 'case_id', v_case.id));

  RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.concierge_proposal_accept(_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_quote := NULL;
    v_req := NULL;
    IF v_item.quote_id IS NOT NULL THEN
      SELECT * INTO v_quote FROM public.concierge_quotes WHERE id = v_item.quote_id FOR UPDATE;
    END IF;
    IF v_item.request_id IS NOT NULL THEN
      SELECT * INTO v_req FROM public.concierge_case_requests WHERE id = v_item.request_id;
    END IF;

    IF v_quote.id IS NOT NULL AND v_quote.status = 'submitted' THEN
      UPDATE public.concierge_quotes
         SET status = 'accepted'
       WHERE id = v_quote.id;
    END IF;

    INSERT INTO public.orders
      (user_id, status, currency, subtotal_amount, total_amount,
       notes, client_request_id, confirmed_at)
    VALUES (v_uid, 'pending', COALESCE(v_quote.currency, v_item.currency, 'MXN'),
            ROUND(COALESCE(v_item.amount_cents,0)::numeric/100.0, 2),
            ROUND(COALESCE(v_item.amount_cents,0)::numeric/100.0, 2),
            'Concierge proposal ' || _proposal_id::text ||
              CASE WHEN v_quote.id IS NOT NULL THEN ' · quote ' || v_quote.id::text
                   ELSE ' · partida ' || v_item.id::text END,
            'concierge:' || _proposal_id::text || ':' ||
              COALESCE(v_quote.id::text, v_item.id::text),
            now())
    RETURNING id INTO v_order_id;

    IF v_req.product_id IS NOT NULL THEN
      INSERT INTO public.order_items
        (order_id, product_id, business_id, quantity, unit_price, currency,
         snapshot_name, snapshot_slug)
      SELECT v_order_id, p.id, v_quote.business_id, 1,
             ROUND(COALESCE(v_item.amount_cents,0)::numeric/100.0, 2),
             COALESCE(v_quote.currency, v_item.currency, 'MXN'), p.name, p.slug
        FROM public.products p WHERE p.id = v_req.product_id
       ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.concierge_case_links (case_id, link_type, target_id, meta)
    VALUES (v_p.case_id, 'order', v_order_id,
            jsonb_build_object('proposal_id', _proposal_id, 'quote_id', v_quote.id))
    ON CONFLICT DO NOTHING;

    v_order_ids := array_append(v_order_ids, v_order_id);

    IF v_quote.id IS NOT NULL THEN
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
    END IF;
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
$function$;