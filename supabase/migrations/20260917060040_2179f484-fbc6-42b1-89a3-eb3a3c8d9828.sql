-- Paso 10 · La reservación en línea guarda los datos de contacto del viajero
-- para poder enviarle su correo. Delta mínimo sobre la función existente:
-- sólo se añaden traveler_email / traveler_name / traveler_locale al INSERT.
CREATE OR REPLACE FUNCTION public.concierge_create_direct_sale_order(_product_id uuid, _quantity integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_product record;
  v_existing_order_id uuid;
  v_order_id uuid;
  v_email text;
  v_name text;
  v_locale text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida';
  END IF;

  IF _quantity IS NULL OR _quantity < 1 THEN
    _quantity := 1;
  END IF;

  SELECT
    p.id, p.name, p.description, p.business_id, p.slug,
    p.direct_sale_enabled, p.direct_sale_price_amount, p.direct_sale_currency,
    p.direct_sale_commission_bps, p.direct_sale_max_quantity,
    p.status, p.deleted_at
  INTO v_product
  FROM public.products p
  WHERE p.id = _product_id;

  IF NOT FOUND OR v_product.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Experiencia no encontrada';
  END IF;

  IF v_product.status <> 'published' THEN
    RAISE EXCEPTION 'La experiencia no esta publicada';
  END IF;

  IF v_product.direct_sale_enabled IS NOT TRUE
     OR v_product.direct_sale_price_amount IS NULL
     OR v_product.direct_sale_price_amount <= 0 THEN
    RAISE EXCEPTION 'La experiencia no esta disponible para venta directa';
  END IF;

  IF v_product.direct_sale_max_quantity IS NOT NULL
     AND _quantity > v_product.direct_sale_max_quantity THEN
    RAISE EXCEPTION 'Cantidad excede el maximo permitido (%)', v_product.direct_sale_max_quantity;
  END IF;

  SELECT o.id INTO v_existing_order_id
  FROM public.concierge_orders o
  JOIN public.concierge_order_items i ON i.order_id = o.id
  WHERE o.user_id = v_uid
    AND o.source_kind = 'direct_sale'
    AND o.status IN ('draft','awaiting_payment')
    AND i.entity_kind = 'product'
    AND i.entity_id = _product_id
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN v_existing_order_id;
  END IF;

  SELECT
    COALESCE(NULLIF(pr.email, ''), u.email),
    NULLIF(TRIM(COALESCE(pr.display_name, CONCAT_WS(' ', pr.first_name, pr.last_name))), ''),
    NULLIF(pr.preferred_language, '')
  INTO v_email, v_name, v_locale
  FROM auth.users u
  LEFT JOIN public.profiles pr ON pr.user_id = u.id
  WHERE u.id = v_uid;

  INSERT INTO public.concierge_orders (
    user_id, source_kind, currency, status,
    editorial_title, editorial_summary, created_by,
    traveler_email, traveler_name, traveler_locale
  ) VALUES (
    v_uid, 'direct_sale',
    COALESCE(v_product.direct_sale_currency, 'MXN'),
    'awaiting_payment',
    v_product.name, v_product.description, v_uid,
    v_email, v_name, v_locale
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.concierge_order_items (
    order_id, entity_kind, entity_id, business_id,
    title, description, quantity, unit_amount, currency,
    commission_bps, commission_source
  ) VALUES (
    v_order_id, 'product', v_product.id, v_product.business_id,
    v_product.name, v_product.description,
    _quantity, v_product.direct_sale_price_amount,
    COALESCE(v_product.direct_sale_currency, 'MXN'),
    COALESCE(v_product.direct_sale_commission_bps, 0),
    'direct_sale'
  );

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'created_from_direct_sale', v_uid,
          jsonb_build_object('product_id', _product_id, 'quantity', _quantity));

  RETURN v_order_id;
END;
$function$;