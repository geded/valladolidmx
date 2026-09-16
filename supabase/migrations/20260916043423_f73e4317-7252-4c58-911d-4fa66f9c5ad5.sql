CREATE OR REPLACE FUNCTION public.concierge_order_create_adjustment(
  _case_id uuid,
  _amount_cents integer,
  _title text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_case record;
  v_plan_id uuid;
  v_currency text := 'MXN';
  v_order_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'concierge')
    OR public.has_role(v_uid, 'concierge_lead')
  ) THEN
    RAISE EXCEPTION 'No autorizado para generar cobros complementarios';
  END IF;

  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN
    RAISE EXCEPTION 'El cobro complementario debe ser mayor a cero';
  END IF;

  SELECT * INTO v_case FROM public.concierge_cases WHERE id = _case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caso no encontrado'; END IF;

  SELECT p.id, COALESCE(p.currency, 'MXN')
    INTO v_plan_id, v_currency
  FROM public.travel_plans p
  WHERE p.case_id = v_case.id
  ORDER BY p.updated_at DESC
  LIMIT 1;

  v_currency := COALESCE(v_currency, 'MXN');

  INSERT INTO public.concierge_orders (
    user_id, source_kind, source_case_id, travel_plan_id,
    currency, status, editorial_title, editorial_summary, created_by
  )
  VALUES (
    v_case.traveler_user_id, 'concierge_proposal', v_case.id, v_plan_id,
    v_currency, 'awaiting_payment',
    COALESCE(NULLIF(BTRIM(_title), ''), 'Ajuste de itinerario'),
    'Cobro complementario por ajuste del itinerario aprobado.',
    v_uid
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.concierge_order_items (
    order_id, entity_kind, entity_id, business_id,
    title, description, quantity, unit_amount, currency,
    commission_bps, commission_source
  ) VALUES (
    v_order_id, 'custom', NULL, NULL,
    COALESCE(NULLIF(BTRIM(_title), ''), 'Ajuste de itinerario'),
    'Diferencia por ajuste del itinerario aprobado.',
    1, _amount_cents, v_currency, 1000, 'concierge'
  );

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'created', v_uid,
          jsonb_build_object('case_id', v_case.id, 'kind', 'itinerary_adjustment', 'amount_cents', _amount_cents));

  INSERT INTO public.concierge_case_links (case_id, link_type, target_id, meta)
  VALUES (v_case.id, 'order', v_order_id, jsonb_build_object('kind', 'itinerary_adjustment'))
  ON CONFLICT DO NOTHING;

  RETURN v_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.concierge_order_create_adjustment(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_order_create_adjustment(uuid, integer, text) TO authenticated;