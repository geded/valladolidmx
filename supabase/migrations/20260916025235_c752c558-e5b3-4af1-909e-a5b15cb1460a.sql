CREATE OR REPLACE FUNCTION public.concierge_order_start_online_payment(
  _order_id uuid,
  _provider text,
  _intent_id text
)
RETURNS public.concierge_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.concierge_orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_order
  FROM public.concierge_orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'reservation_not_found';
  END IF;

  IF v_order.status NOT IN ('draft', 'awaiting_payment') THEN
    RAISE EXCEPTION 'reservation_not_payable';
  END IF;

  UPDATE public.concierge_orders
  SET status = 'awaiting_payment',
      payment_provider = _provider,
      payment_provider_intent_id = _intent_id,
      updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (
    _order_id,
    'payment_initiated',
    auth.uid(),
    jsonb_build_object(
      'provider', _provider,
      'intent_id', _intent_id,
      'amount', v_order.total_amount,
      'currency', v_order.currency
    )
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.concierge_order_start_online_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concierge_order_start_online_payment(uuid, text, text) TO authenticated, service_role;