
-- =====================================================================
-- Wave 4 · Stage 4b — Carrito, Reservas y Órdenes
-- =====================================================================

-- 1. Enums --------------------------------------------------------------
CREATE TYPE public.order_status AS ENUM (
  'cart', 'pending', 'confirmed', 'cancelled', 'fulfilled'
);

CREATE TYPE public.order_event_type AS ENUM (
  'created', 'item_added', 'item_removed', 'item_qty_updated',
  'confirmed', 'cancelled', 'fulfilled', 'note_added'
);

-- 2. orders -------------------------------------------------------------
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'cart',
  currency TEXT NOT NULL DEFAULT 'MXN',
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  client_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_own_cart" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('cart','pending'))
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX orders_one_active_cart_per_user
  ON public.orders (user_id) WHERE status = 'cart';
CREATE UNIQUE INDEX orders_client_request_id_per_user
  ON public.orders (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
CREATE INDEX idx_orders_user_status_created
  ON public.orders (user_id, status, created_at DESC);

-- 3. order_items --------------------------------------------------------
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  currency TEXT NOT NULL,
  snapshot_name TEXT NOT NULL,
  snapshot_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_unique_product UNIQUE (order_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "order_items_modify_own_cart" ON public.order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'cart')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'cart')
  );

CREATE INDEX idx_order_items_order ON public.order_items (order_id);

-- 4. order_events (auditoría) ------------------------------------------
CREATE TABLE public.order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type public.order_event_type NOT NULL,
  actor_user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_events_select_own" ON public.order_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE INDEX idx_order_events_order_created
  ON public.order_events (order_id, created_at DESC);

-- 5. Trigger updated_at ------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_orders_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_touch_updated_at();

CREATE TRIGGER order_items_touch_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_touch_updated_at();

-- 6. Helper: recompute totals ------------------------------------------
CREATE OR REPLACE FUNCTION public._order_recompute_totals(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_sub
  FROM public.order_items WHERE order_id = p_order_id;
  UPDATE public.orders
    SET subtotal_amount = v_sub, total_amount = v_sub, updated_at = now()
    WHERE id = p_order_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._order_recompute_totals(UUID) FROM PUBLIC, anon, authenticated;

-- 7. RPC: cart_ensure --------------------------------------------------
CREATE OR REPLACE FUNCTION public.cart_ensure()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_id FROM public.orders
    WHERE user_id = v_uid AND status = 'cart' LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.orders (user_id, status) VALUES (v_uid, 'cart')
    RETURNING id INTO v_id;
  INSERT INTO public.order_events (order_id, event_type, actor_user_id)
    VALUES (v_id, 'created', v_uid);
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cart_ensure() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cart_ensure() TO authenticated;

-- 8. RPC: cart_add_item ------------------------------------------------
CREATE OR REPLACE FUNCTION public.cart_add_item(
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_client_request_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order UUID;
  v_item UUID;
  v_price NUMERIC(12,2);
  v_currency TEXT;
  v_name TEXT;
  v_slug TEXT;
  v_business UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  SELECT price_amount, price_currency, name, slug, business_id
    INTO v_price, v_currency, v_name, v_slug, v_business
    FROM public.products
    WHERE id = p_product_id AND status = 'published' AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_available'; END IF;
  IF v_price IS NULL THEN RAISE EXCEPTION 'product_no_price'; END IF;

  v_order := public.cart_ensure();

  -- Idempotencia por client_request_id: si ya existe un evento con el
  -- mismo request id, devolvemos el item existente sin reaplicar.
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
$$;
REVOKE EXECUTE ON FUNCTION public.cart_add_item(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cart_add_item(UUID, INTEGER, TEXT) TO authenticated;

-- 9. RPC: cart_update_qty ----------------------------------------------
CREATE OR REPLACE FUNCTION public.cart_update_qty(p_item_id UUID, p_quantity INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_order UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;
  SELECT oi.order_id INTO v_order FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = p_item_id AND o.user_id = v_uid AND o.status = 'cart';
  IF v_order IS NULL THEN RAISE EXCEPTION 'item_not_in_cart'; END IF;
  UPDATE public.order_items SET quantity = p_quantity, updated_at = now()
    WHERE id = p_item_id;
  INSERT INTO public.order_events (order_id, event_type, actor_user_id, payload)
    VALUES (v_order, 'item_qty_updated', v_uid,
            jsonb_build_object('item_id', p_item_id, 'quantity', p_quantity));
  PERFORM public._order_recompute_totals(v_order);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cart_update_qty(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cart_update_qty(UUID, INTEGER) TO authenticated;

-- 10. RPC: cart_remove_item --------------------------------------------
CREATE OR REPLACE FUNCTION public.cart_remove_item(p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_order UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT oi.order_id INTO v_order FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = p_item_id AND o.user_id = v_uid AND o.status = 'cart';
  IF v_order IS NULL THEN RETURN; END IF;
  DELETE FROM public.order_items WHERE id = p_item_id;
  INSERT INTO public.order_events (order_id, event_type, actor_user_id, payload)
    VALUES (v_order, 'item_removed', v_uid,
            jsonb_build_object('item_id', p_item_id));
  PERFORM public._order_recompute_totals(v_order);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cart_remove_item(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cart_remove_item(UUID) TO authenticated;

-- 11. RPC: order_confirm -----------------------------------------------
CREATE OR REPLACE FUNCTION public.order_confirm(
  p_client_request_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order UUID;
  v_count INTEGER;
  v_existing UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;

  -- Idempotencia: si ya hay una orden pending/confirmed con ese request id, devolverla.
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

  -- Revalidación: todos los productos deben seguir publicados.
  PERFORM 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order
      AND (p.status <> 'published' OR p.deleted_at IS NOT NULL);
  IF FOUND THEN RAISE EXCEPTION 'cart_has_unavailable_items'; END IF;

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
$$;
REVOKE EXECUTE ON FUNCTION public.order_confirm(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_confirm(TEXT, TEXT) TO authenticated;

-- 12. RPC: order_cancel ------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_cancel(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_status public.order_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT status INTO v_status FROM public.orders
    WHERE id = p_order_id AND user_id = v_uid;
  IF v_status IS NULL THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_status NOT IN ('cart','pending','confirmed') THEN
    RAISE EXCEPTION 'order_not_cancellable';
  END IF;
  UPDATE public.orders
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE id = p_order_id;
  INSERT INTO public.order_events (order_id, event_type, actor_user_id)
    VALUES (p_order_id, 'cancelled', v_uid);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.order_cancel(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_cancel(UUID) TO authenticated;
