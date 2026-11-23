CREATE TABLE public.commerce_stay_night_rates (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  night date NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, night)
);
GRANT SELECT ON public.commerce_stay_night_rates TO authenticated;
GRANT ALL ON public.commerce_stay_night_rates TO service_role;
ALTER TABLE public.commerce_stay_night_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipo de la empresa consulta precios por noche" ON public.commerce_stay_night_rates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p
                  WHERE p.id = commerce_stay_night_rates.product_id
                    AND public.has_business_access(auth.uid(), p.business_id, 'viewer'::business_user_role)));

CREATE OR REPLACE FUNCTION public._commerce_stay_night_price(_product_id uuid, _night date)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT r.price_cents FROM public.commerce_stay_night_rates r WHERE r.product_id = _product_id AND r.night = _night),
    (SELECT p.direct_sale_price_amount FROM public.products p WHERE p.id = _product_id))
$function$;
REVOKE EXECUTE ON FUNCTION public._commerce_stay_night_price(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._commerce_stay_night_price(uuid, date) TO service_role;

DROP FUNCTION IF EXISTS public.commerce_public_stay_calendar(uuid, date, integer);
CREATE FUNCTION public.commerce_public_stay_calendar(_product_id uuid, _from date DEFAULT NULL, _days integer DEFAULT 120)
 RETURNS TABLE(night date, available integer, price_cents integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_p record;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_start date;
  v_rooms integer;
BEGIN
  SELECT p.id, p.business_id, p.direct_sale_stock INTO v_p
    FROM public.products p
    JOIN public.businesses b ON b.id = p.business_id
   WHERE p.id = _product_id AND p.product_type = 'hotel' AND p.status = 'published'
     AND p.deleted_at IS NULL AND p.direct_sale_enabled IS TRUE
     AND b.status = 'published' AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.business_online_sale_allows(v_p.business_id, 'hotel'::product_type, 'pagina') THEN RETURN; END IF;

  v_rooms := COALESCE(v_p.direct_sale_stock, 1);
  v_start := GREATEST(COALESCE(_from, v_today), v_today);
  RETURN QUERY
    SELECT d::date,
           CASE WHEN public._commerce_stay_night_blocked(v_p.id, v_p.business_id, d::date) THEN 0
                ELSE GREATEST(v_rooms - public._commerce_stay_rooms_taken(v_p.id, d::date), 0) END,
           public._commerce_stay_night_price(v_p.id, d::date)
      FROM generate_series(v_start, v_start + LEAST(GREATEST(COALESCE(_days, 120), 1), 200) - 1, interval '1 day') AS d;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_public_stay_calendar(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_public_stay_calendar(uuid, date, integer) TO anon, authenticated, service_role;

-- Calendario del equipo: precio, bloqueo y ocupación por noche.
CREATE OR REPLACE FUNCTION public.commerce_stay_manage_calendar(_product_id uuid, _from date DEFAULT NULL, _days integer DEFAULT 62)
 RETURNS TABLE(night date, price_cents integer, custom_price boolean, blocked boolean, business_closed boolean, rooms integer, taken integer)
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
  SELECT p.id, p.business_id, p.direct_sale_stock INTO v_p
    FROM public.products p WHERE p.id = _product_id AND p.product_type = 'hotel' AND p.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'stay_room_not_found'; END IF;
  IF v_uid IS NULL OR NOT public.has_business_access(v_uid, v_p.business_id, 'editor'::business_user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_start := GREATEST(COALESCE(_from, v_today), v_today - 31);
  RETURN QUERY
    SELECT d::date,
           public._commerce_stay_night_price(v_p.id, d::date),
           EXISTS (SELECT 1 FROM public.commerce_stay_night_rates r WHERE r.product_id = v_p.id AND r.night = d::date),
           EXISTS (SELECT 1 FROM public.commerce_blackouts b
                    WHERE b.product_id = v_p.id
                      AND b.starts_at < ((d::date + 1)::timestamp AT TIME ZONE 'America/Merida')
                      AND b.ends_at > (d::date::timestamp AT TIME ZONE 'America/Merida')),
           EXISTS (SELECT 1 FROM public.commerce_blackouts b
                    WHERE b.business_id = v_p.business_id AND b.product_id IS NULL
                      AND b.starts_at < ((d::date + 1)::timestamp AT TIME ZONE 'America/Merida')
                      AND b.ends_at > (d::date::timestamp AT TIME ZONE 'America/Merida')),
           COALESCE(v_p.direct_sale_stock, 1),
           public._commerce_stay_rooms_taken(v_p.id, d::date)
      FROM generate_series(v_start, v_start + LEAST(GREATEST(COALESCE(_days, 62), 1), 120) - 1, interval '1 day') AS d;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_stay_manage_calendar(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_stay_manage_calendar(uuid, date, integer) TO authenticated, service_role;

-- Cambiar precio, volver al precio base, bloquear o desbloquear noches.
CREATE OR REPLACE FUNCTION public.commerce_stay_set_nights(_product_id uuid, _nights date[], _action text, _price_cents integer DEFAULT NULL)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_p record;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_night date;
  v_s timestamptz;
  v_e timestamptz;
  v_b record;
  v_count integer := 0;
BEGIN
  SELECT p.id, p.business_id INTO v_p
    FROM public.products p WHERE p.id = _product_id AND p.product_type = 'hotel' AND p.deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'stay_room_not_found'; END IF;
  IF v_uid IS NULL OR NOT public.has_business_access(v_uid, v_p.business_id, 'editor'::business_user_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _action NOT IN ('price', 'base_price', 'block', 'unblock') THEN RAISE EXCEPTION 'stay_action_invalid'; END IF;
  IF _nights IS NULL OR cardinality(_nights) = 0 THEN RAISE EXCEPTION 'stay_nights_empty'; END IF;
  IF cardinality(_nights) > 400 THEN RAISE EXCEPTION 'stay_nights_too_many'; END IF;
  IF _action = 'price' AND (_price_cents IS NULL OR _price_cents <= 0 OR _price_cents > 100000000) THEN
    RAISE EXCEPTION 'stay_price_invalid';
  END IF;

  FOR v_night IN SELECT DISTINCT n FROM unnest(_nights) AS n ORDER BY 1 LOOP
    IF v_night < v_today OR v_night > v_today + 550 THEN RAISE EXCEPTION 'stay_night_out_of_range'; END IF;
    v_s := v_night::timestamp AT TIME ZONE 'America/Merida';
    v_e := (v_night + 1)::timestamp AT TIME ZONE 'America/Merida';

    IF _action = 'price' THEN
      INSERT INTO public.commerce_stay_night_rates (product_id, night, price_cents, updated_by, updated_at)
      VALUES (v_p.id, v_night, _price_cents, v_uid, now())
      ON CONFLICT (product_id, night) DO UPDATE
        SET price_cents = EXCLUDED.price_cents, updated_by = EXCLUDED.updated_by, updated_at = now();
    ELSIF _action = 'base_price' THEN
      DELETE FROM public.commerce_stay_night_rates WHERE product_id = v_p.id AND night = v_night;
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
REVOKE EXECUTE ON FUNCTION public.commerce_stay_set_nights(uuid, date[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_stay_set_nights(uuid, date[], text, integer) TO authenticated, service_role;

-- Solicitud de reserva: el total suma el precio de cada noche.
CREATE OR REPLACE FUNCTION public.commerce_request_stay(_product_id uuid, _check_in date, _check_out date, _guests integer, _channel text DEFAULT 'pagina')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_p record;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_nights integer;
  v_night date;
  v_rooms integer;
  v_bps integer;
  v_order_id uuid;
  v_confirm_by timestamptz := now() + interval '12 hours';
  v_email text;
  v_name text;
  v_locale text;
  v_meta jsonb;
  v_prices jsonb := '[]'::jsonb;
  v_price integer;
  v_total integer := 0;
  v_uniform boolean := true;
  v_first integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _check_in IS NULL OR _check_out IS NULL OR _check_out <= _check_in THEN RAISE EXCEPTION 'stay_dates_invalid'; END IF;
  IF _check_in < v_today THEN RAISE EXCEPTION 'stay_dates_past'; END IF;
  v_nights := _check_out - _check_in;
  IF v_nights > 30 THEN RAISE EXCEPTION 'stay_too_long'; END IF;

  SELECT p.id, p.name, p.description, p.business_id, p.capacity, p.direct_sale_stock,
         p.direct_sale_price_amount, p.direct_sale_currency, b.display_name
    INTO v_p
    FROM public.products p
    JOIN public.businesses b ON b.id = p.business_id
   WHERE p.id = _product_id AND p.product_type = 'hotel' AND p.status = 'published'
     AND p.deleted_at IS NULL AND p.direct_sale_enabled IS TRUE
     AND b.status = 'published' AND b.deleted_at IS NULL
   FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'stay_room_not_available'; END IF;
  IF NOT public.business_online_sale_allows(v_p.business_id, 'hotel'::product_type, _channel) THEN
    RAISE EXCEPTION 'online_sales_not_enabled_for_business';
  END IF;
  IF v_p.direct_sale_price_amount IS NULL OR v_p.direct_sale_price_amount <= 0 THEN RAISE EXCEPTION 'stay_room_without_price'; END IF;
  IF COALESCE(v_p.direct_sale_currency, 'MXN') <> 'MXN' THEN RAISE EXCEPTION 'stay_room_currency'; END IF;
  IF _guests IS NULL OR _guests < 1 OR (v_p.capacity IS NOT NULL AND _guests > v_p.capacity) THEN
    RAISE EXCEPTION 'stay_guests_invalid';
  END IF;

  UPDATE public.concierge_orders o
     SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'replaced_by_new_stay_request'
   WHERE o.user_id = v_uid AND o.source_kind = 'direct_sale' AND o.status = 'draft'
     AND o.metadata ->> 'stay_status' = 'pending_host'
     AND EXISTS (SELECT 1 FROM public.concierge_order_items i
                  WHERE i.order_id = o.id AND i.entity_kind = 'hotel_night' AND i.entity_id = _product_id);

  v_rooms := COALESCE(v_p.direct_sale_stock, 1);
  FOR v_night IN SELECT d::date FROM generate_series(_check_in, _check_out - 1, interval '1 day') AS d LOOP
    IF public._commerce_stay_night_blocked(v_p.id, v_p.business_id, v_night)
       OR public._commerce_stay_rooms_taken(v_p.id, v_night) >= v_rooms THEN
      RAISE EXCEPTION 'stay_night_unavailable';
    END IF;
    v_price := public._commerce_stay_night_price(v_p.id, v_night);
    IF v_first IS NULL THEN v_first := v_price; ELSIF v_price <> v_first THEN v_uniform := false; END IF;
    v_total := v_total + v_price;
    v_prices := v_prices || jsonb_build_array(jsonb_build_object('night', v_night, 'price_cents', v_price));
  END LOOP;

  v_bps := public.online_sales_commission_bps('reservas');

  SELECT COALESCE(NULLIF(pr.email, ''), u.email),
         NULLIF(TRIM(COALESCE(pr.display_name, CONCAT_WS(' ', pr.first_name, pr.last_name))), ''),
         NULLIF(pr.preferred_language, '')
    INTO v_email, v_name, v_locale
    FROM auth.users u LEFT JOIN public.profiles pr ON pr.user_id = u.id
   WHERE u.id = v_uid;

  v_meta := jsonb_build_object(
    'sale_mode', 'reservas', 'business_id', v_p.business_id, 'channel', _channel,
    'stay_status', 'pending_host', 'confirm_by', v_confirm_by,
    'check_in', _check_in, 'check_out', _check_out, 'nights', v_nights, 'guests', _guests
  );

  INSERT INTO public.concierge_orders (
    user_id, source_kind, currency, status, editorial_title, editorial_summary, created_by,
    traveler_email, traveler_name, traveler_locale, metadata
  ) VALUES (
    v_uid, 'direct_sale', 'MXN', 'draft',
    'Reserva de hospedaje · ' || v_p.display_name,
    v_p.display_name || ' confirma tu reserva en menos de 12 horas. Pagas cuando el hotel confirme.',
    v_uid, v_email, v_name, v_locale, v_meta
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.concierge_order_items (
    order_id, entity_kind, entity_id, business_id, title, description,
    quantity, unit_amount, currency, commission_bps, commission_source, scheduled_for, metadata
  ) VALUES (
    v_order_id, 'hotel_night', v_p.id, v_p.business_id, v_p.name, v_p.description,
    CASE WHEN v_uniform THEN v_nights ELSE 1 END,
    CASE WHEN v_uniform THEN v_first ELSE v_total END,
    'MXN', v_bps, 'direct_sale',
    (_check_in::timestamp + interval '15 hours') AT TIME ZONE 'America/Merida',
    (v_meta - 'business_id' - 'channel') || jsonb_build_object('nightly_prices', v_prices)
  );

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'stay_requested', v_uid,
          jsonb_build_object('product_id', v_p.id, 'check_in', _check_in, 'check_out', _check_out,
                             'guests', _guests, 'channel', _channel, 'total_cents', v_total));
  RETURN v_order_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_request_stay(uuid, date, date, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_request_stay(uuid, date, date, integer, text) TO authenticated, service_role;