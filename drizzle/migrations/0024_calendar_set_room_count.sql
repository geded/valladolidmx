CREATE OR REPLACE FUNCTION public.commerce_calendar_set_rooms(_product_id uuid, _rooms integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_p record;
BEGIN
  SELECT p.id, p.business_id INTO v_p
    FROM public.products p
   WHERE p.id = _product_id AND p.product_type = 'hotel' AND p.deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'calendar_product_not_found'; END IF;
  IF v_uid IS NULL OR NOT public.has_business_access(v_uid, v_p.business_id, 'editor'::business_user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _rooms IS NULL OR _rooms < 1 OR _rooms > 200 THEN RAISE EXCEPTION 'stay_rooms_invalid'; END IF;
  UPDATE public.products SET direct_sale_stock = _rooms, updated_by = v_uid WHERE id = v_p.id;
  RETURN _rooms;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_calendar_set_rooms(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_calendar_set_rooms(uuid, integer) TO authenticated, service_role;