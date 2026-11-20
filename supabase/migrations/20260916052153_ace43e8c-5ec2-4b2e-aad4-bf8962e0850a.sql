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
  v_scheduled INTEGER := 0;
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

  -- Aplica automáticamente al viaje los días/horas capturados en la propuesta.
  BEGIN
    v_scheduled := public.concierge_proposal_apply_schedule_to_plan(_proposal_id);
  EXCEPTION WHEN OTHERS THEN
    v_scheduled := 0;
  END;

  IF v_scheduled > 0 THEN
    INSERT INTO public.concierge_case_timeline
      (case_id, event_type, severity, actor_user_id, summary, payload)
    VALUES (v_p.case_id, 'Concierge.Itinerary.Scheduled', 'info', v_uid,
            'Itinerario armado con los horarios de la propuesta',
            jsonb_build_object('proposal_id', _proposal_id, 'items', v_scheduled));
  END IF;

  RETURN jsonb_build_object('proposal_id', _proposal_id,
                            'order_ids', to_jsonb(v_order_ids),
                            'scheduled_items', v_scheduled);
END;
$function$;