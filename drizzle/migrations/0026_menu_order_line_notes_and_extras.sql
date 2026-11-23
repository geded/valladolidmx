CREATE OR REPLACE FUNCTION public.commerce_create_menu_order(_business_id uuid, _items jsonb, _channel text DEFAULT 'pagina')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_business record;
  v_order_id uuid;
  v_bps integer;
  v_line jsonb;
  v_item record;
  v_for record;
  v_for_id uuid;
  v_qty integer;
  v_count integer := 0;
  v_base integer := 0;
  v_note text;
  v_title text;
  v_email text;
  v_name text;
  v_locale text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'menu_order_empty';
  END IF;
  IF jsonb_array_length(_items) > 40 THEN RAISE EXCEPTION 'menu_order_too_many_lines'; END IF;

  SELECT b.id, b.display_name INTO v_business
    FROM public.businesses b
   WHERE b.id = _business_id AND b.status = 'published' AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'business_not_found'; END IF;

  IF NOT public.business_online_sale_allows(_business_id, 'restaurante'::product_type, _channel) THEN
    RAISE EXCEPTION 'online_sales_not_enabled_for_business';
  END IF;

  -- Los extras (leches, toppings…) acompañan una bebida o platillo; nunca van solos.
  SELECT count(*) INTO v_base
    FROM jsonb_array_elements(_items) AS l(line)
    JOIN public.business_menu_items m
      ON m.id = NULLIF(l.line ->> 'menu_item_id', '')::uuid
     AND m.business_id = _business_id
     AND m.is_available
   WHERE NOT public.menu_section_is_extra(m.section);
  IF v_base = 0 THEN RAISE EXCEPTION 'menu_order_extras_need_item'; END IF;

  v_bps := public.online_sales_commission_bps('pedidos');

  -- Un solo pedido abierto por viajero y empresa.
  UPDATE public.concierge_orders o
     SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'replaced_by_new_menu_order'
   WHERE o.user_id = v_uid
     AND o.source_kind = 'direct_sale'
     AND o.status IN ('draft','awaiting_payment')
     AND EXISTS (SELECT 1 FROM public.concierge_order_items i
                  WHERE i.order_id = o.id AND i.entity_kind = 'menu_item' AND i.business_id = _business_id);

  SELECT COALESCE(NULLIF(pr.email, ''), u.email),
         NULLIF(TRIM(COALESCE(pr.display_name, CONCAT_WS(' ', pr.first_name, pr.last_name))), ''),
         NULLIF(pr.preferred_language, '')
    INTO v_email, v_name, v_locale
    FROM auth.users u LEFT JOIN public.profiles pr ON pr.user_id = u.id
   WHERE u.id = v_uid;

  INSERT INTO public.concierge_orders (
    user_id, source_kind, currency, status, editorial_title, editorial_summary, created_by,
    traveler_email, traveler_name, traveler_locale, metadata
  ) VALUES (
    v_uid, 'direct_sale', 'MXN', 'awaiting_payment',
    'Pedido para recoger · ' || v_business.display_name,
    'Recoges tu pedido en ' || v_business.display_name || '. Muestra tu folio al llegar.',
    v_uid, v_email, v_name, v_locale,
    jsonb_build_object('sale_mode', 'pedidos', 'fulfillment', 'recoger', 'business_id', _business_id, 'channel', _channel)
  ) RETURNING id INTO v_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE(NULLIF(v_line ->> 'quantity', '')::int, 0);
    IF v_qty < 1 OR v_qty > 20 THEN RAISE EXCEPTION 'menu_order_quantity'; END IF;

    SELECT m.id, m.name, m.description, m.section, m.price_amount, m.price_currency
      INTO v_item
      FROM public.business_menu_items m
     WHERE m.id = (v_line ->> 'menu_item_id')::uuid
       AND m.business_id = _business_id
       AND m.is_available;
    IF NOT FOUND THEN RAISE EXCEPTION 'menu_item_unavailable'; END IF;
    IF v_item.price_amount IS NULL OR v_item.price_amount <= 0 THEN RAISE EXCEPTION 'menu_item_without_price'; END IF;
    IF COALESCE(v_item.price_currency, 'MXN') <> 'MXN' THEN RAISE EXCEPTION 'menu_item_currency'; END IF;

    v_note := NULLIF(left(btrim(regexp_replace(COALESCE(v_line ->> 'note', ''), '\s+', ' ', 'g')), 140), '');
    v_title := v_item.name;
    v_for_id := NULLIF(v_line ->> 'for_item', '')::uuid;

    IF v_for_id IS NOT NULL THEN
      -- Extra ligado a una bebida o platillo del mismo pedido.
      IF NOT public.menu_section_is_extra(v_item.section) THEN RAISE EXCEPTION 'menu_order_extra_invalid'; END IF;
      SELECT m.id, m.name, m.section INTO v_for
        FROM public.business_menu_items m
       WHERE m.id = v_for_id AND m.business_id = _business_id AND m.is_available;
      IF NOT FOUND OR public.menu_section_is_extra(v_for.section)
         OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(_items) AS l(line)
                         WHERE NULLIF(l.line ->> 'menu_item_id', '')::uuid = v_for_id
                           AND NULLIF(l.line ->> 'for_item', '') IS NULL) THEN
        RAISE EXCEPTION 'menu_order_extra_invalid';
      END IF;
      v_title := v_item.name || ' · para ' || v_for.name;
      v_note := NULL;
    ELSIF v_note IS NOT NULL THEN
      v_title := v_item.name || ' · Nota: ' || v_note;
    END IF;

    INSERT INTO public.concierge_order_items (
      order_id, entity_kind, entity_id, business_id, title, description,
      quantity, unit_amount, currency, commission_bps, commission_source, metadata
    ) VALUES (
      v_order_id, 'menu_item', v_item.id, _business_id, left(v_title, 300), v_item.description,
      v_qty, ROUND(v_item.price_amount * 100)::int, 'MXN', v_bps, 'direct_sale',
      jsonb_strip_nulls(jsonb_build_object('sale_mode', 'pedidos', 'fulfillment', 'recoger', 'section', v_item.section,
                         'note', v_note, 'for_item', v_for_id))
    );
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'created_from_menu_order', v_uid,
          jsonb_build_object('business_id', _business_id, 'lines', v_count, 'channel', _channel));

  RETURN v_order_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.commerce_create_menu_order(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_create_menu_order(uuid, jsonb, text) TO authenticated, service_role;