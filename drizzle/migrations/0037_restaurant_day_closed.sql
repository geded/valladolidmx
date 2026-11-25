
CREATE OR REPLACE FUNCTION public.restaurant_set_day_closed(_business_id uuid, _date date, _closed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_from timestamptz := _date::timestamp AT TIME ZONE 'America/Merida';
        v_to timestamptz := (_date + 1)::timestamp AT TIME ZONE 'America/Merida';
BEGIN
  IF NOT (public.has_business_access(auth.uid(), _business_id, 'manager') OR public.is_editor_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.commerce_blackouts
   WHERE business_id = _business_id AND product_id IS NULL AND starts_at = v_from AND ends_at = v_to;
  IF _closed THEN
    INSERT INTO public.commerce_blackouts (business_id, product_id, starts_at, ends_at, reason, created_by)
    VALUES (_business_id, NULL, v_from, v_to, 'Mesas: día cerrado', auth.uid());
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.restaurant_day_closed(_business_id uuid, _date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.commerce_blackouts b WHERE b.business_id = _business_id AND b.product_id IS NULL
    AND b.starts_at < ((_date + 1)::timestamp AT TIME ZONE 'America/Merida')
    AND b.ends_at > (_date::timestamp AT TIME ZONE 'America/Merida'));
$$;
REVOKE EXECUTE ON FUNCTION public.restaurant_set_day_closed(uuid, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restaurant_set_day_closed(uuid, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_day_closed(uuid, date) TO anon, authenticated;
