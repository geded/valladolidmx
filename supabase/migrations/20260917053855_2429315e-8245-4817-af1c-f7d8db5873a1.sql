CREATE OR REPLACE FUNCTION public.concierge_order_refund(
  _order_id uuid,
  _reason text DEFAULT NULL,
  _amount integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_is_ops boolean;
  v_amount integer;
  v_released integer := 0;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticacion requerida'; END IF;

  SELECT * INTO v_order FROM public.concierge_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservacion no encontrada'; END IF;

  v_is_ops :=
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'concierge')
    OR public.has_role(v_uid, 'concierge_lead');

  IF NOT v_is_ops THEN RAISE EXCEPTION 'No autorizado'; END IF;

  IF v_order.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'refunded', 'folio', v_order.folio,
                              'released', 0, 'amount',
                              COALESCE((v_order.metadata->'refund'->>'amount')::integer, 0));
  END IF;

  IF v_order.paid_at IS NULL OR v_order.status NOT IN ('paid','fulfilled') THEN
    RAISE EXCEPTION 'Solo se reembolsan reservaciones pagadas (estado=%)', v_order.status;
  END IF;

  v_amount := COALESCE(_amount, v_order.total_amount);
  IF v_amount < 0 OR v_amount > v_order.total_amount THEN
    RAISE EXCEPTION 'Importe de reembolso invalido';
  END IF;

  -- Devuelve al cupo los lugares confirmados o apartados de esta reservacion.
  FOR r IN
    SELECT id FROM public.commerce_reservation_holds
    WHERE order_id = _order_id AND status IN ('held','confirmed')
  LOOP
    UPDATE public.commerce_reservation_holds
       SET status = 'released',
           released_reason = COALESCE(_reason, 'reembolso')
     WHERE id = r.id;
    v_released := v_released + 1;
  END LOOP;

  UPDATE public.concierge_orders
     SET status = 'refunded',
         cancelled_at = COALESCE(cancelled_at, now()),
         cancelled_reason = COALESCE(_reason, cancelled_reason),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'refund', jsonb_build_object(
             'amount', v_amount,
             'currency', v_order.currency,
             'reason', _reason,
             'method', v_order.payment_provider,
             'by', v_uid,
             'at', now()
           )
         ),
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (_order_id, 'payment_refunded', v_uid,
          jsonb_build_object('amount', v_amount, 'currency', v_order.currency,
                             'reason', _reason, 'method', v_order.payment_provider,
                             'released_seats', v_released));

  RETURN jsonb_build_object('ok', true, 'status', 'refunded', 'folio', v_order.folio,
                            'amount', v_amount, 'released', v_released);
END;
$function$;

REVOKE ALL ON FUNCTION public.concierge_order_refund(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concierge_order_refund(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.concierge_order_refund(uuid, text, integer) TO service_role;