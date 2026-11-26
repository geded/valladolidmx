ALTER TABLE public.alux_public_sessions ADD COLUMN IF NOT EXISTS device_proof_hash text;
COMMENT ON COLUMN public.alux_public_sessions.device_proof_hash IS 'SHA-256 of server-issued HttpOnly device proof; never returned to browsers.';
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
DROP POLICY IF EXISTS order_items_modify_own_cart ON public.order_items;
CREATE OR REPLACE FUNCTION public.order_confirm(p_client_request_id text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order uuid;
  v_count integer;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF p_client_request_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.orders WHERE user_id = v_uid AND client_request_id = p_client_request_id AND status IN ('pending','confirmed') LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;
  SELECT id INTO v_order FROM public.orders WHERE user_id = v_uid AND status = 'cart' LIMIT 1 FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'cart_empty'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.order_items WHERE order_id = v_order;
  IF v_count = 0 THEN RAISE EXCEPTION 'cart_empty'; END IF;
  PERFORM 1 FROM public.order_items oi LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order AND (p.id IS NULL OR p.status <> 'published' OR p.deleted_at IS NOT NULL);
  IF FOUND THEN RAISE EXCEPTION 'cart_has_unavailable_items'; END IF;
  PERFORM 1 FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order AND (p.conversion_mode IS DISTINCT FROM 'reservar_en_linea'::public.product_conversion_mode OR p.accepts_online_payment IS NOT TRUE OR p.price_amount IS NULL OR p.price_amount < 0);
  IF FOUND THEN RAISE EXCEPTION 'cart_has_unreservable_items'; END IF;
  -- Reject rather than silently charging a different price than the traveler saw.
  PERFORM 1 FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order AND (oi.unit_price IS DISTINCT FROM p.price_amount OR oi.currency IS DISTINCT FROM p.price_currency OR oi.business_id IS DISTINCT FROM p.business_id);
  IF FOUND THEN RAISE EXCEPTION 'cart_price_changed'; END IF;
  PERFORM public._order_recompute_totals(v_order);
  UPDATE public.orders SET status = 'pending', confirmed_at = now(), client_request_id = COALESCE(p_client_request_id, client_request_id), notes = COALESCE(LEFT(p_notes, 1000), notes), updated_at = now() WHERE id = v_order;
  INSERT INTO public.order_events (order_id, event_type, actor_user_id, payload) VALUES (v_order, 'confirmed', v_uid, jsonb_build_object('client_request_id', p_client_request_id));
  RETURN v_order;
END;
$function$;
REVOKE ALL ON FUNCTION public.order_confirm(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_confirm(text,text) TO authenticated, service_role;