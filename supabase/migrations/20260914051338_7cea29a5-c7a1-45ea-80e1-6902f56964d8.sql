
-- 1) Enlazar la reservación al viaje del cliente al crearla desde la propuesta
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
  v_plan_id uuid;
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

  SELECT l.target_id INTO v_plan_id
  FROM public.concierge_case_links l
  WHERE l.case_id = v_case.id AND l.link_type = 'travel_plan'
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT p.id INTO v_plan_id
    FROM public.travel_plans p
    WHERE p.case_id = v_case.id
    ORDER BY p.updated_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.concierge_orders (
    user_id, source_kind, source_proposal_id, source_case_id, travel_plan_id,
    currency, status, editorial_title, editorial_summary, created_by
  )
  VALUES (
    v_case.traveler_user_id, 'concierge_proposal', v_proposal.id, v_case.id, v_plan_id,
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

  IF v_plan_id IS NOT NULL THEN
    INSERT INTO public.concierge_case_links (case_id, link_type, target_id, meta)
    SELECT v_case.id, 'order', v_order_id, jsonb_build_object('travel_plan_id', v_plan_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.concierge_case_links
      WHERE case_id = v_case.id AND link_type = 'order' AND target_id = v_order_id
    );
  END IF;

  RETURN v_order_id;
END;
$function$;

-- 2) Marcar reservación como pagada en efectivo
CREATE OR REPLACE FUNCTION public.concierge_order_mark_paid_cash(_order_id uuid, _note text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_is_ops boolean;
  v_plan_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticacion requerida'; END IF;

  SELECT * INTO v_order FROM public.concierge_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservacion no encontrada'; END IF;

  v_is_ops :=
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'concierge')
    OR public.has_role(v_uid, 'concierge_lead');

  IF v_order.user_id <> v_uid AND NOT v_is_ops THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_order.status IN ('paid','fulfilled') THEN
    RETURN jsonb_build_object('ok', true, 'status', v_order.status, 'folio', v_order.folio,
                              'travel_plan_id', v_order.travel_plan_id);
  END IF;

  IF v_order.status NOT IN ('draft','awaiting_payment') THEN
    RAISE EXCEPTION 'La reservacion no admite pago (estado=%)', v_order.status;
  END IF;

  v_plan_id := v_order.travel_plan_id;
  IF v_plan_id IS NULL AND v_order.source_case_id IS NOT NULL THEN
    SELECT l.target_id INTO v_plan_id
    FROM public.concierge_case_links l
    WHERE l.case_id = v_order.source_case_id AND l.link_type = 'travel_plan'
    ORDER BY l.created_at DESC LIMIT 1;
  END IF;

  UPDATE public.concierge_orders
     SET status = 'paid',
         paid_at = now(),
         payment_provider = 'cash',
         payment_provider_intent_id = COALESCE(payment_provider_intent_id, 'cash_' || left(_order_id::text, 8)),
         travel_plan_id = COALESCE(travel_plan_id, v_plan_id),
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (_order_id, 'payment_succeeded', v_uid,
          jsonb_build_object('method', 'cash', 'note', _note,
                             'amount', v_order.total_amount, 'currency', v_order.currency));

  IF v_order.source_proposal_id IS NOT NULL THEN
    UPDATE public.concierge_proposals
       SET status = 'accepted', responded_at = COALESCE(responded_at, now()), updated_at = now()
     WHERE id = v_order.source_proposal_id AND status <> 'accepted';
  END IF;

  IF v_order.source_case_id IS NOT NULL THEN
    UPDATE public.concierge_cases
       SET status = 'closed_won', updated_at = now(), last_activity_at = now()
     WHERE id = v_order.source_case_id AND status <> 'closed_won';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'paid', 'folio', v_order.folio,
                            'travel_plan_id', v_plan_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.concierge_order_mark_paid_cash(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concierge_order_mark_paid_cash(uuid, text) TO authenticated;
