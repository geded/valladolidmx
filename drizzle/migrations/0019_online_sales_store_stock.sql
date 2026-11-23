ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS direct_sale_stock integer
  CHECK (direct_sale_stock IS NULL OR direct_sale_stock >= 0);

COMMENT ON COLUMN public.products.direct_sale_stock IS
  'Piezas disponibles para venta en línea (tienda y pedidos para recoger). NULL = sin límite.';

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
  v_mode text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida';
  END IF;

  IF _quantity IS NULL OR _quantity < 1 THEN
    _quantity := 1;
  END IF;

  SELECT
    p.id, p.name, p.description, p.business_id, p.slug, p.product_type,
    p.direct_sale_enabled, p.direct_sale_price_amount, p.direct_sale_currency,
    p.direct_sale_commission_bps, p.direct_sale_max_quantity, p.direct_sale_stock,
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

  IF NOT public.business_online_sale_allows(v_product.business_id, v_product.product_type) THEN
    RAISE EXCEPTION 'La venta en linea no esta activa para esta empresa';
  END IF;

  IF v_product.direct_sale_max_quantity IS NOT NULL
     AND _quantity > v_product.direct_sale_max_quantity THEN
    RAISE EXCEPTION 'Cantidad excede el maximo permitido (%)', v_product.direct_sale_max_quantity;
  END IF;

  v_mode := public.online_sale_mode_for(v_product.product_type);
  IF v_mode IN ('tienda','pedidos')
     AND v_product.direct_sale_stock IS NOT NULL
     AND _quantity > v_product.direct_sale_stock THEN
    RAISE EXCEPTION 'insufficient_stock';
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
    -- Tienda y pedidos: el viajero puede cambiar cuántas piezas quiere.
    IF v_mode IN ('tienda','pedidos') THEN
      UPDATE public.concierge_order_items
         SET quantity = _quantity
       WHERE order_id = v_existing_order_id
         AND entity_kind = 'product'
         AND entity_id = _product_id
         AND quantity IS DISTINCT FROM _quantity;
    END IF;
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
    commission_bps, commission_source, metadata
  ) VALUES (
    v_order_id, 'product', v_product.id, v_product.business_id,
    v_product.name, v_product.description,
    _quantity, v_product.direct_sale_price_amount,
    COALESCE(v_product.direct_sale_currency, 'MXN'),
    COALESCE(v_product.direct_sale_commission_bps, 0),
    'direct_sale',
    CASE WHEN v_mode IN ('tienda','pedidos')
         THEN jsonb_build_object('sale_mode', v_mode, 'fulfillment', 'recoger')
         ELSE '{}'::jsonb END
  );

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'created_from_direct_sale', v_uid,
          jsonb_build_object('product_id', _product_id, 'quantity', _quantity));

  RETURN v_order_id;
END;
$function$;

-- Al quedar pagado, se descuentan las piezas de tienda y pedidos.
CREATE OR REPLACE FUNCTION public._commerce_orders_decrement_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.products p
     SET direct_sale_stock = GREATEST(p.direct_sale_stock - q.qty, 0)
    FROM (
      SELECT i.entity_id AS product_id, SUM(i.quantity)::int AS qty
        FROM public.concierge_order_items i
       WHERE i.order_id = NEW.id AND i.entity_kind = 'product'
       GROUP BY i.entity_id
    ) q
   WHERE p.id = q.product_id
     AND p.direct_sale_stock IS NOT NULL
     AND public.online_sale_mode_for(p.product_type) IN ('tienda','pedidos');
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._commerce_orders_decrement_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_commerce_orders_stock_upd ON public.concierge_orders;
CREATE TRIGGER trg_commerce_orders_stock_upd
  AFTER UPDATE OF status ON public.concierge_orders
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid')
  EXECUTE FUNCTION public._commerce_orders_decrement_stock();

DROP TRIGGER IF EXISTS trg_commerce_orders_stock_ins ON public.concierge_orders;
CREATE TRIGGER trg_commerce_orders_stock_ins
  AFTER INSERT ON public.concierge_orders
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION public._commerce_orders_decrement_stock();