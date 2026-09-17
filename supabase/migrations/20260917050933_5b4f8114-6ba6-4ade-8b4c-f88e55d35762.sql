
-- Salidas disponibles para el visitante (sólo experiencias publicadas con venta en línea autorizada)
CREATE OR REPLACE FUNCTION public.commerce_public_departures(
  _product_id uuid,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  available integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.starts_at, d.ends_at, d.timezone,
         public.commerce_departure_availability(d.id)
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
$$;

GRANT EXECUTE ON FUNCTION public.commerce_public_departures(uuid, timestamptz, timestamptz) TO anon, authenticated, service_role;

-- Ajuste numérico de configuración central
CREATE OR REPLACE FUNCTION public.commerce_setting_int(_key text, _default integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_raw text; v_val integer;
BEGIN
  SELECT value #>> '{}' INTO v_raw FROM public.platform_settings WHERE key = _key;
  IF v_raw IS NULL THEN RETURN _default; END IF;
  BEGIN
    v_val := v_raw::integer;
  EXCEPTION WHEN others THEN
    RETURN _default;
  END;
  RETURN COALESCE(v_val, _default);
END;
$$;

-- Inicia una reservación: aparta lugares y crea la orden de venta directa
CREATE OR REPLACE FUNCTION public.commerce_booking_start(
  _product_id uuid,
  _departure_id uuid,
  _quantity integer,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_max integer;
  v_ttl integer;
  v_order_id uuid;
  v_hold public.commerce_reservation_holds%ROWTYPE;
  v_has_departures boolean;
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
    PERFORM 1 FROM public.commerce_departures WHERE id = _departure_id AND product_id = _product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'departure_product_mismatch'; END IF;
  END IF;

  v_order_id := public.concierge_create_direct_sale_order(_product_id, _quantity);

  IF _departure_id IS NOT NULL THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.commerce_booking_start(uuid, uuid, integer, text) TO authenticated, service_role;

-- Acceso a los apartados de una reservación (dueño o equipo interno)
CREATE OR REPLACE FUNCTION public.commerce_can_manage_order_holds(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.concierge_orders o WHERE o.id = _order_id AND o.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('super_admin','admin','editor','concierge')
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.commerce_order_holds_confirm(_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  IF NOT public.commerce_can_manage_order_holds(_order_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT id FROM public.commerce_reservation_holds WHERE order_id = _order_id AND status IN ('held','confirmed') LOOP
    PERFORM public.commerce_hold_confirm(r.id, _order_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.commerce_order_holds_release(_order_id uuid, _reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  IF NOT public.commerce_can_manage_order_holds(_order_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT id FROM public.commerce_reservation_holds WHERE order_id = _order_id AND status = 'held' LOOP
    PERFORM public.commerce_hold_release(r.id, COALESCE(_reason, 'reservación cancelada'));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.commerce_order_booking(_order_id uuid)
RETURNS TABLE (
  hold_id uuid,
  status text,
  quantity integer,
  expires_at timestamptz,
  departure_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  product_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.id, h.status, h.quantity, h.expires_at,
         d.id, d.starts_at, d.ends_at, d.timezone, p.name
  FROM public.commerce_reservation_holds h
  JOIN public.commerce_departures d ON d.id = h.departure_id
  JOIN public.products p ON p.id = h.product_id
  WHERE h.order_id = _order_id
    AND public.commerce_can_manage_order_holds(_order_id)
  ORDER BY d.starts_at
$$;

GRANT EXECUTE ON FUNCTION public.commerce_can_manage_order_holds(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commerce_order_holds_confirm(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commerce_order_holds_release(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commerce_order_booking(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commerce_setting_int(text, integer) TO authenticated, service_role;
