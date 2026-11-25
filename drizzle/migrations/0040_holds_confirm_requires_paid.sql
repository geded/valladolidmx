CREATE OR REPLACE FUNCTION public.commerce_order_holds_confirm(_order_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  IF NOT public.commerce_can_manage_order_holds(_order_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.concierge_orders WHERE id = _order_id AND status IN ('paid','fulfilled')) THEN
    RAISE EXCEPTION 'La reservacion no esta pagada';
  END IF;
  FOR r IN SELECT id FROM public.commerce_reservation_holds WHERE order_id = _order_id AND status IN ('held','confirmed') LOOP
    PERFORM public.commerce_hold_confirm(r.id, _order_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;