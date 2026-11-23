CREATE OR REPLACE FUNCTION public._commerce_stay_rooms_taken(_product_id uuid, _night date)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::int
    FROM public.concierge_order_items i
    JOIN public.concierge_orders o ON o.id = i.order_id
   WHERE i.entity_kind = 'hotel_night'
     AND i.entity_id = _product_id
     AND (i.metadata ->> 'check_in')::date <= _night
     AND (i.metadata ->> 'check_out')::date > _night
     AND (
       o.status IN ('awaiting_payment', 'paid', 'fulfilled')
       OR (o.status = 'draft'
           AND o.metadata ->> 'stay_status' = 'pending_host'
           AND (o.metadata ->> 'confirm_by')::timestamptz > now())
     )
$function$;
REVOKE EXECUTE ON FUNCTION public._commerce_stay_rooms_taken(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._commerce_stay_rooms_taken(uuid, date) TO service_role;

CREATE OR REPLACE FUNCTION public._commerce_stay_night_blocked(_product_id uuid, _business_id uuid, _night date)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.commerce_blackouts b
     WHERE (b.product_id = _product_id OR b.business_id = _business_id)
       AND b.starts_at < ((_night + 1)::timestamp AT TIME ZONE 'America/Merida')
       AND b.ends_at > (_night::timestamp AT TIME ZONE 'America/Merida')
  )
$function$;
REVOKE EXECUTE ON FUNCTION public._commerce_stay_night_blocked(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._commerce_stay_night_blocked(uuid, uuid, date) TO service_role;

-- Calendario público: habitaciones libres por noche (sin datos de huéspedes).
CREATE OR REPLACE FUNCTION public.commerce_public_stay_calendar(_product_id uuid, _from date DEFAULT NULL, _days integer DEFAULT 120)
 RETURNS TABLE(night date, available integer)
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
                ELSE GREATEST(v_rooms - public._commerce_stay_rooms_taken(v_p.id, d::date), 0) END
      FROM generate_series(v_start, v_start + LEAST(GREATEST(COALESCE(_days, 120), 1), 200) - 1, interval '1 day') AS d;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_public_stay_calendar(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_public_stay_calendar(uuid, date, integer) TO anon, authenticated, service_role;

-- Solicitud de reserva: aparta las noches 12 h mientras el hotel confirma.
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

  -- Una sola solicitud abierta por viajero y habitación.
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
    v_nights, v_p.direct_sale_price_amount, 'MXN', v_bps, 'direct_sale',
    (_check_in::timestamp + interval '15 hours') AT TIME ZONE 'America/Merida',
    v_meta - 'business_id' - 'channel'
  );

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'stay_requested', v_uid,
          jsonb_build_object('product_id', v_p.id, 'check_in', _check_in, 'check_out', _check_out,
                             'guests', _guests, 'channel', _channel));
  RETURN v_order_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_request_stay(uuid, date, date, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_request_stay(uuid, date, date, integer, text) TO authenticated, service_role;

-- El hotel (o el administrador) confirma o rechaza dentro de las 12 horas.
CREATE OR REPLACE FUNCTION public.commerce_decide_stay(_order_id uuid, _accept boolean, _note text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_o record;
  v_business uuid;
  v_note text := NULLIF(left(btrim(COALESCE(_note, '')), 500), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT o.id, o.status, o.metadata INTO v_o FROM public.concierge_orders o WHERE o.id = _order_id FOR UPDATE;
  IF NOT FOUND OR v_o.metadata ->> 'sale_mode' IS DISTINCT FROM 'reservas' THEN RAISE EXCEPTION 'stay_not_found'; END IF;
  v_business := (v_o.metadata ->> 'business_id')::uuid;
  IF NOT (public.has_business_access(v_uid, v_business, 'editor'::business_user_role)
          OR public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_o.status <> 'draft' OR v_o.metadata ->> 'stay_status' IS DISTINCT FROM 'pending_host' THEN
    RAISE EXCEPTION 'stay_already_decided';
  END IF;
  IF (v_o.metadata ->> 'confirm_by')::timestamptz <= now() THEN RAISE EXCEPTION 'stay_confirmation_expired'; END IF;

  IF _accept THEN
    UPDATE public.concierge_orders
       SET status = 'awaiting_payment',
           metadata = metadata || jsonb_build_object('stay_status', 'confirmed', 'decided_at', now(), 'decided_by', v_uid, 'host_note', v_note)
     WHERE id = _order_id;
    UPDATE public.concierge_order_items SET fulfillment_status = 'confirmed'
     WHERE order_id = _order_id AND entity_kind = 'hotel_night';
  ELSE
    UPDATE public.concierge_orders
       SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'host_declined',
           metadata = metadata || jsonb_build_object('stay_status', 'declined', 'decided_at', now(), 'decided_by', v_uid, 'host_note', v_note)
     WHERE id = _order_id;
    UPDATE public.concierge_order_items SET fulfillment_status = 'cancelled'
     WHERE order_id = _order_id AND entity_kind = 'hotel_night';
  END IF;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (_order_id, CASE WHEN _accept THEN 'stay_confirmed' ELSE 'stay_declined' END, v_uid,
          jsonb_build_object('note', v_note));
  RETURN CASE WHEN _accept THEN 'confirmed' ELSE 'declined' END;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.commerce_decide_stay(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_decide_stay(uuid, boolean, text) TO authenticated, service_role;

-- Candado: nada se cobra antes de que el hotel confirme.
CREATE OR REPLACE FUNCTION public._commerce_orders_guard_pending_stay()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.metadata ->> 'stay_status', '') = 'pending_host'
     AND (NEW.status IN ('awaiting_payment', 'paid', 'fulfilled') OR (NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL)) THEN
    RAISE EXCEPTION 'stay_pending_host_confirmation';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_commerce_orders_guard_pending_stay ON public.concierge_orders;
CREATE TRIGGER trg_commerce_orders_guard_pending_stay
  BEFORE UPDATE ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION public._commerce_orders_guard_pending_stay();