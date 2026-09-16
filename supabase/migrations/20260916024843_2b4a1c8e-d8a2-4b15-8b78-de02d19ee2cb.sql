CREATE OR REPLACE FUNCTION public.concierge_order_mark_paid_online(
  _order_id uuid,
  _provider text,
  _intent_id text,
  _event_id text
)
RETURNS public.concierge_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.concierge_orders;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_order
  FROM public.concierge_orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_found';
  END IF;

  IF v_order.status IN ('paid', 'fulfilled') THEN
    RETURN v_order;
  END IF;

  IF v_order.status NOT IN ('draft', 'awaiting_payment') THEN
    RAISE EXCEPTION 'reservation_not_payable';
  END IF;

  UPDATE public.concierge_orders
  SET status = 'paid',
      paid_at = now(),
      payment_provider = _provider,
      payment_provider_intent_id = _intent_id,
      updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  SELECT _order_id, 'payment_succeeded', NULL,
    jsonb_build_object(
      'method', 'online',
      'provider', _provider,
      'intent_id', _intent_id,
      'provider_event_id', _event_id,
      'amount', v_order.total_amount,
      'currency', v_order.currency
    )
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.concierge_order_events
    WHERE order_id = _order_id
      AND event_type = 'payment_succeeded'
      AND payload->>'provider_event_id' = _event_id
  );

  IF v_order.source_proposal_id IS NOT NULL THEN
    UPDATE public.concierge_proposals
    SET status = 'accepted', updated_at = now()
    WHERE id = v_order.source_proposal_id
      AND status <> 'accepted';
  END IF;

  IF v_order.source_case_id IS NOT NULL THEN
    UPDATE public.concierge_cases
    SET status = 'closed_won', updated_at = now()
    WHERE id = v_order.source_case_id
      AND status <> 'closed_won';
  END IF;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.concierge_order_mark_paid_online(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.concierge_order_mark_paid_online(uuid, text, text, text) TO service_role;