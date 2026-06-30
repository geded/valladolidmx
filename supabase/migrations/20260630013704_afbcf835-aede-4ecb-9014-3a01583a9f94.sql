-- 14.40.4b — R1/R4/R5: Estrategia Comercial del Producto + Secondary CTA
-- Ajustes derivados del Reporte de Compatibilidad 14.40.B v1.1.

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.product_conversion_mode AS ENUM (
    'informacion',
    'arma_tu_viaje',
    'solicitar_cotizacion',
    'reservar_en_linea',
    'whatsapp',
    'telefono',
    'sitio_externo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.product_visibility_level AS ENUM (
    'standard',
    'destacado',
    'premium'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Columnas en products (aditivas, con defaults seguros)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS conversion_mode public.product_conversion_mode
    NOT NULL DEFAULT 'informacion',
  ADD COLUMN IF NOT EXISTS primary_action_label text,
  ADD COLUMN IF NOT EXISTS secondary_action_mode text,
  ADD COLUMN IF NOT EXISTS secondary_action_label text,
  ADD COLUMN IF NOT EXISTS requires_availability boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_online_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generates_commission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eligible_for_ems_campaigns boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility_level public.product_visibility_level
    NOT NULL DEFAULT 'standard';

-- 3) Restricciones de integridad (R4)
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_online_payment_requires_reservation,
  DROP CONSTRAINT IF EXISTS products_primary_action_label_length,
  DROP CONSTRAINT IF EXISTS products_secondary_action_label_length,
  DROP CONSTRAINT IF EXISTS products_secondary_action_mode_format;

ALTER TABLE public.products
  ADD CONSTRAINT products_online_payment_requires_reservation
    CHECK (
      accepts_online_payment = false
      OR (conversion_mode = 'reservar_en_linea' AND requires_availability = true)
    ),
  ADD CONSTRAINT products_primary_action_label_length
    CHECK (primary_action_label IS NULL OR char_length(primary_action_label) BETWEEN 1 AND 60),
  ADD CONSTRAINT products_secondary_action_label_length
    CHECK (secondary_action_label IS NULL OR char_length(secondary_action_label) BETWEEN 1 AND 60),
  ADD CONSTRAINT products_secondary_action_mode_format
    CHECK (
      secondary_action_mode IS NULL
      OR (char_length(secondary_action_mode) BETWEEN 1 AND 40
          AND secondary_action_mode ~ '^[a-z][a-z0-9_]*$')
    );

-- 4) R2: endurecer cart_add_item y order_confirm
CREATE OR REPLACE FUNCTION public.cart_add_item(
  p_product_id uuid,
  p_quantity integer DEFAULT 1,
  p_client_request_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_order UUID;
  v_item UUID;
  v_price NUMERIC(12,2);
  v_currency TEXT;
  v_name TEXT;
  v_slug TEXT;
  v_business UUID;
  v_mode public.product_conversion_mode;
  v_accepts_online BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  SELECT price_amount, price_currency, name, slug, business_id,
         conversion_mode, accepts_online_payment
    INTO v_price, v_currency, v_name, v_slug, v_business,
         v_mode, v_accepts_online
    FROM public.products
    WHERE id = p_product_id AND status = 'published' AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_available'; END IF;
  IF v_price IS NULL THEN RAISE EXCEPTION 'product_no_price'; END IF;

  -- 14.40.B v1.1 §3.5: sólo productos reservables en línea entran al carrito.
  IF v_mode <> 'reservar_en_linea' OR v_accepts_online IS NOT TRUE THEN
    RAISE EXCEPTION 'product_not_reservable';
  END IF;

  v_order := public.cart_ensure();

  IF p_client_request_id IS NOT NULL THEN
    SELECT (payload->>'item_id')::UUID INTO v_item
      FROM public.order_events
      WHERE order_id = v_order
        AND event_type = 'item_added'
        AND payload->>'client_request_id' = p_client_request_id
      LIMIT 1;
    IF v_item IS NOT NULL THEN RETURN v_item; END IF;
  END IF;

  INSERT INTO public.order_items (
    order_id, product_id, business_id, quantity, unit_price, currency,
    snapshot_name, snapshot_slug
  ) VALUES (
    v_order, p_product_id, v_business, p_quantity, v_price, v_currency,
    v_name, v_slug
  )
  ON CONFLICT (order_id, product_id) DO UPDATE
    SET quantity = LEAST(public.order_items.quantity + EXCLUDED.quantity, 99),
        updated_at = now()
  RETURNING id INTO v_item;

  INSERT INTO public.order_events (order_id, event_type, actor_user_id, payload)
    VALUES (v_order, 'item_added', v_uid, jsonb_build_object(
      'item_id', v_item,
      'product_id', p_product_id,
      'quantity', p_quantity,
      'unit_price', v_price,
      'client_request_id', p_client_request_id
    ));

  PERFORM public._order_recompute_totals(v_order);
  RETURN v_item;
END;
$function$;

CREATE OR REPLACE FUNCTION public.order_confirm(
  p_client_request_id text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_order UUID;
  v_count INTEGER;
  v_existing UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;

  IF p_client_request_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.orders
      WHERE user_id = v_uid AND client_request_id = p_client_request_id
        AND status IN ('pending','confirmed') LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;

  SELECT id INTO v_order FROM public.orders
    WHERE user_id = v_uid AND status = 'cart' LIMIT 1;
  IF v_order IS NULL THEN RAISE EXCEPTION 'cart_empty'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.order_items WHERE order_id = v_order;
  IF v_count = 0 THEN RAISE EXCEPTION 'cart_empty'; END IF;

  -- Revalidación: publicados Y reservables en línea con pago en línea.
  PERFORM 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order
      AND (p.status <> 'published' OR p.deleted_at IS NOT NULL);
  IF FOUND THEN RAISE EXCEPTION 'cart_has_unavailable_items'; END IF;

  PERFORM 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order
      AND (p.conversion_mode <> 'reservar_en_linea' OR p.accepts_online_payment IS NOT TRUE);
  IF FOUND THEN RAISE EXCEPTION 'cart_has_unreservable_items'; END IF;

  PERFORM public._order_recompute_totals(v_order);

  UPDATE public.orders
    SET status = 'pending',
        confirmed_at = now(),
        client_request_id = COALESCE(p_client_request_id, client_request_id),
        notes = COALESCE(LEFT(p_notes, 1000), notes),
        updated_at = now()
    WHERE id = v_order;

  INSERT INTO public.order_events (order_id, event_type, actor_user_id, payload)
    VALUES (v_order, 'confirmed', v_uid,
            jsonb_build_object('client_request_id', p_client_request_id));
  RETURN v_order;
END;
$function$;