ALTER TABLE public.concierge_order_items DROP CONSTRAINT IF EXISTS concierge_order_items_entity_kind_check;
ALTER TABLE public.concierge_order_items ADD CONSTRAINT concierge_order_items_entity_kind_check
  CHECK (entity_kind = ANY (ARRAY['product','experience','tour','hotel_night','restaurant_booking','event','custom','menu_item']));

CREATE OR REPLACE FUNCTION public.online_sales_commission_bps(_mode text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT CASE WHEN (s.value ->> _mode) ~ '^[0-9]+$'
                  AND (s.value ->> _mode)::int BETWEEN 0 AND 10000
                 THEN (s.value ->> _mode)::int END
       FROM public.platform_settings s
      WHERE s.key = 'commerce.online_sales.commission_bps'),
    1500)
$function$;
REVOKE EXECUTE ON FUNCTION public.online_sales_commission_bps(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.online_sales_commission_bps(text) TO authenticated, service_role;

-- Pedido para recoger armado desde la carta publicada.
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
  v_qty integer;
  v_count integer := 0;
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

    INSERT INTO public.concierge_order_items (
      order_id, entity_kind, entity_id, business_id, title, description,
      quantity, unit_amount, currency, commission_bps, commission_source, metadata
    ) VALUES (
      v_order_id, 'menu_item', v_item.id, _business_id, v_item.name, v_item.description,
      v_qty, ROUND(v_item.price_amount * 100)::int, 'MXN', v_bps, 'direct_sale',
      jsonb_build_object('sale_mode', 'pedidos', 'fulfillment', 'recoger', 'section', v_item.section)
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

-- Alta en grupo de productos de tienda (solo administrador).
CREATE OR REPLACE FUNCTION public.admin_create_store_products(_business_id uuid, _items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_bps integer;
  v_line jsonb;
  v_name text;
  v_price numeric;
  v_stock integer;
  v_base text;
  v_slug text;
  v_n integer;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT public.business_online_sale_allows(_business_id, 'artesanal'::product_type) THEN
    RAISE EXCEPTION 'online_sales_not_enabled_for_business';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'store_products_empty';
  END IF;
  IF jsonb_array_length(_items) > 200 THEN RAISE EXCEPTION 'store_products_too_many'; END IF;

  v_bps := public.online_sales_commission_bps('tienda');

  FOR v_line IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_name := left(btrim(COALESCE(v_line ->> 'name', '')), 200);
    v_price := NULLIF(v_line ->> 'price', '')::numeric;
    v_stock := NULLIF(v_line ->> 'stock', '')::int;
    IF v_name = '' THEN RAISE EXCEPTION 'store_product_name_required'; END IF;
    IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'store_product_price_required'; END IF;
    IF v_stock IS NOT NULL AND v_stock < 0 THEN RAISE EXCEPTION 'store_product_stock_invalid'; END IF;

    v_base := trim(both '-' from regexp_replace(lower(translate(v_name,
      'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g'));
    IF v_base = '' THEN v_base := 'producto'; END IF;
    v_base := left(v_base, 100);
    v_slug := v_base; v_n := 1;
    WHILE EXISTS (SELECT 1 FROM public.products p WHERE p.business_id = _business_id AND p.slug = v_slug) LOOP
      v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    END LOOP;

    INSERT INTO public.products (
      business_id, product_type, slug, name, description, price_amount, price_currency,
      status, published_at, conversion_mode, primary_action_label,
      requires_availability, accepts_online_payment, generates_commission,
      direct_sale_enabled, direct_sale_price_amount, direct_sale_currency, direct_sale_commission_bps,
      direct_sale_stock, created_by, updated_by
    ) VALUES (
      _business_id, 'artesanal', v_slug, v_name, NULLIF(left(btrim(COALESCE(v_line ->> 'description', '')), 2000), ''),
      v_price, 'MXN', 'published', now(), 'reservar_en_linea', 'Comprar',
      true, true, true,
      true, ROUND(v_price * 100)::int, 'MXN', v_bps,
      v_stock, v_uid, v_uid
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_create_store_products(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_store_products(uuid, jsonb) TO authenticated, service_role;