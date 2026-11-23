COMMENT ON TABLE public.commerce_stay_night_rates IS 'Precio por día de cualquier producto que se reserva por fecha (noche de hotel o día de experiencia/salida). Días sin fila usan products.direct_sale_price_amount.';

DROP FUNCTION IF EXISTS public.commerce_stay_manage_calendar(uuid, date, integer);
DROP FUNCTION IF EXISTS public.commerce_stay_set_nights(uuid, date[], text, integer);

CREATE OR REPLACE FUNCTION public.commerce_day_calendar_manage(_product_id uuid, _from date DEFAULT NULL, _days integer DEFAULT 42)
 RETURNS TABLE(day date, price_cents integer, custom_price boolean, blocked boolean, business_closed boolean,
               rooms integer, taken integer, departures integer, seats_left integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_p record;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_start date;
BEGIN
  SELECT p.id, p.business_id, p.direct_sale_stock, p.product_type INTO v_p
    FROM public.products p WHERE p.id = _product_id AND p.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'calendar_product_not_found'; END IF;
  IF v_uid IS NULL OR NOT public.has_business_access(v_uid, v_p.business_id, 'editor'::business_user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_start := GREATEST(COALESCE(_from, v_today), v_today - 31);
  RETURN QUERY
    WITH days AS (
      SELECT d::date AS day,
             (d::date::timestamp AT TIME ZONE 'America/Merida') AS s,
             ((d::date + 1)::timestamp AT TIME ZONE 'America/Merida') AS e
        FROM generate_series(v_start, v_start + LEAST(GREATEST(COALESCE(_days, 42), 1), 120) - 1, interval '1 day') AS d
    )
    SELECT x.day,
           public._commerce_stay_night_price(v_p.id, x.day),
           EXISTS (SELECT 1 FROM public.commerce_stay_night_rates r WHERE r.product_id = v_p.id AND r.night = x.day),
           EXISTS (SELECT 1 FROM public.commerce_blackouts b WHERE b.product_id = v_p.id AND b.starts_at < x.e AND b.ends_at > x.s),
           EXISTS (SELECT 1 FROM public.commerce_blackouts b
                    WHERE b.business_id = v_p.business_id AND b.product_id IS NULL AND b.starts_at < x.e AND b.ends_at > x.s),
           CASE WHEN v_p.product_type = 'hotel' THEN COALESCE(v_p.direct_sale_stock, 1) ELSE 0 END,
           CASE WHEN v_p.product_type = 'hotel' THEN public._commerce_stay_rooms_taken(v_p.id, x.day) ELSE 0 END,
           (SELECT COUNT(*)::int FROM public.commerce_departures d
             WHERE d.product_id = v_p.id AND d.status = 'scheduled' AND d.starts_at >= x.s AND d.starts_at < x.e),
           (SELECT COALESCE(SUM(public.commerce_departure_availability(d.id)), 0)::int FROM public.commerce_departures d
             WHERE d.product_id = v_p.id AND d.status = 'scheduled' AND d.starts_at >= x.s AND d.starts_at < x.e)
      FROM days x;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_day_calendar_manage(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_day_calendar_manage(uuid, date, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.commerce_day_calendar_set(_product_id uuid, _days date[], _action text, _price_cents integer DEFAULT NULL)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_p record;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_day date;
  v_s timestamptz;
  v_e timestamptz;
  v_b record;
  v_count integer := 0;
BEGIN
  SELECT p.id, p.business_id INTO v_p
    FROM public.products p WHERE p.id = _product_id AND p.deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'calendar_product_not_found'; END IF;
  IF v_uid IS NULL OR NOT public.has_business_access(v_uid, v_p.business_id, 'editor'::business_user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _action NOT IN ('price', 'base_price', 'block', 'unblock') THEN RAISE EXCEPTION 'stay_action_invalid'; END IF;
  IF _days IS NULL OR cardinality(_days) = 0 THEN RAISE EXCEPTION 'stay_nights_empty'; END IF;
  IF cardinality(_days) > 400 THEN RAISE EXCEPTION 'stay_nights_too_many'; END IF;
  IF _action = 'price' AND (_price_cents IS NULL OR _price_cents <= 0 OR _price_cents > 100000000) THEN
    RAISE EXCEPTION 'stay_price_invalid';
  END IF;

  FOR v_day IN SELECT DISTINCT n FROM unnest(_days) AS n ORDER BY 1 LOOP
    IF v_day < v_today OR v_day > v_today + 550 THEN RAISE EXCEPTION 'stay_night_out_of_range'; END IF;
    v_s := v_day::timestamp AT TIME ZONE 'America/Merida';
    v_e := (v_day + 1)::timestamp AT TIME ZONE 'America/Merida';

    IF _action = 'price' THEN
      INSERT INTO public.commerce_stay_night_rates (product_id, night, price_cents, updated_by, updated_at)
      VALUES (v_p.id, v_day, _price_cents, v_uid, now())
      ON CONFLICT (product_id, night) DO UPDATE
        SET price_cents = EXCLUDED.price_cents, updated_by = EXCLUDED.updated_by, updated_at = now();
    ELSIF _action = 'base_price' THEN
      DELETE FROM public.commerce_stay_night_rates WHERE product_id = v_p.id AND night = v_day;
    ELSIF _action = 'block' THEN
      IF NOT EXISTS (SELECT 1 FROM public.commerce_blackouts b
                      WHERE b.product_id = v_p.id AND b.starts_at <= v_s AND b.ends_at >= v_e) THEN
        INSERT INTO public.commerce_blackouts (product_id, starts_at, ends_at, reason, created_by)
        VALUES (v_p.id, v_s, v_e, 'Bloqueado en el calendario', v_uid);
      END IF;
    ELSE
      FOR v_b IN SELECT * FROM public.commerce_blackouts b
                  WHERE b.product_id = v_p.id AND b.starts_at < v_e AND b.ends_at > v_s LOOP
        DELETE FROM public.commerce_blackouts WHERE id = v_b.id;
        IF v_b.starts_at < v_s THEN
          INSERT INTO public.commerce_blackouts (product_id, starts_at, ends_at, reason, created_by)
          VALUES (v_p.id, v_b.starts_at, v_s, v_b.reason, v_b.created_by);
        END IF;
        IF v_b.ends_at > v_e THEN
          INSERT INTO public.commerce_blackouts (product_id, starts_at, ends_at, reason, created_by)
          VALUES (v_p.id, v_e, v_b.ends_at, v_b.reason, v_b.created_by);
        END IF;
      END LOOP;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_day_calendar_set(uuid, date[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_day_calendar_set(uuid, date[], text, integer) TO authenticated, service_role;

-- Fechas públicas de experiencias con el precio de ese día.
DROP FUNCTION IF EXISTS public.commerce_public_departures(uuid, timestamptz, timestamptz);
CREATE FUNCTION public.commerce_public_departures(_product_id uuid, _from timestamp with time zone DEFAULT NULL::timestamp with time zone, _to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, timezone text, available integer, price_cents integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.starts_at, d.ends_at, d.timezone,
         public.commerce_departure_availability(d.id),
         public._commerce_stay_night_price(d.product_id, (d.starts_at AT TIME ZONE COALESCE(NULLIF(d.timezone, ''), 'America/Merida'))::date)
  FROM public.commerce_departures d
  JOIN public.products p ON p.id = d.product_id
  WHERE d.product_id = _product_id
    AND p.status = 'published'
    AND p.deleted_at IS NULL
    AND p.direct_sale_enabled IS TRUE
    AND d.status = 'scheduled'
    AND d.starts_at > now()
    AND d.starts_at >= COALESCE(_from, now())
    AND d.starts_at <= COALESCE(_to, now() + interval '120 days')
    AND NOT EXISTS (
      SELECT 1 FROM public.commerce_blackouts b
      WHERE (b.product_id = d.product_id OR b.business_id = p.business_id)
        AND d.starts_at >= b.starts_at AND d.starts_at < b.ends_at
    )
    AND public.commerce_departure_availability(d.id) > 0
  ORDER BY d.starts_at
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_public_departures(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_public_departures(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;

-- Reserva de experiencia: precio por persona del día de la salida.
CREATE OR REPLACE FUNCTION public.commerce_booking_start(_product_id uuid, _departure_id uuid, _quantity integer, _idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_max integer;
  v_ttl integer;
  v_order_id uuid;
  v_hold public.commerce_reservation_holds%ROWTYPE;
  v_has_departures boolean;
  v_dep record;
  v_day_price integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _quantity IS NULL OR _quantity < 1 THEN _quantity := 1; END IF;

  v_max := public.commerce_setting_int('reservations.max_quantity', 20);
  IF _quantity > v_max THEN RAISE EXCEPTION 'quantity_above_platform_max'; END IF;
  v_ttl := public.commerce_setting_int('reservations.hold_minutes', 20);

  SELECT EXISTS (
    SELECT 1 FROM public.commerce_departures d
    WHERE d.product_id = _product_id AND d.status = 'scheduled' AND d.starts_at > now()
  ) INTO v_has_departures;

  IF _departure_id IS NULL AND v_has_departures THEN
    RAISE EXCEPTION 'departure_required';
  END IF;

  IF _departure_id IS NOT NULL THEN
    SELECT d.starts_at, d.timezone INTO v_dep FROM public.commerce_departures d
     WHERE d.id = _departure_id AND d.product_id = _product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'departure_product_mismatch'; END IF;
  END IF;

  v_order_id := public.concierge_create_direct_sale_order(_product_id, _quantity);

  IF _departure_id IS NOT NULL THEN
    SELECT r.price_cents INTO v_day_price
      FROM public.commerce_stay_night_rates r
     WHERE r.product_id = _product_id
       AND r.night = (v_dep.starts_at AT TIME ZONE COALESCE(NULLIF(v_dep.timezone, ''), 'America/Merida'))::date;
    IF v_day_price IS NOT NULL THEN
      UPDATE public.concierge_order_items
         SET unit_amount = v_day_price,
             metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('day_price', true)
       WHERE order_id = v_order_id AND entity_id = _product_id;
    END IF;

    SELECT * INTO v_hold
    FROM public.commerce_hold_create(_departure_id, _quantity, _idempotency_key, v_ttl, v_uid);

    UPDATE public.commerce_reservation_holds
    SET order_id = v_order_id
    WHERE id = v_hold.id;

    INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
    VALUES (v_order_id, 'departure_held', v_uid,
            jsonb_build_object('departure_id', _departure_id, 'hold_id', v_hold.id, 'quantity', _quantity));
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'hold_id', v_hold.id,
    'expires_at', v_hold.expires_at
  );
END;
$function$;