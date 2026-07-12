
-- CV4.2 · Checkout narrativo del viajero (retry con RAISE correcto)

CREATE OR REPLACE FUNCTION public.concierge_create_order_from_proposal(
  _proposal_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposal record;
  v_case record;
  v_existing_order_id uuid;
  v_order_id uuid;
  v_item record;
  v_is_ops boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticacion requerida';
  END IF;

  SELECT * INTO v_proposal FROM public.concierge_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Propuesta no encontrada'; END IF;

  SELECT * INTO v_case FROM public.concierge_cases WHERE id = v_proposal.case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caso no encontrado'; END IF;

  v_is_ops :=
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'concierge')
    OR public.has_role(v_uid, 'concierge_lead');

  IF v_case.traveler_user_id <> v_uid AND NOT v_is_ops THEN
    RAISE EXCEPTION 'No autorizado para confirmar esta propuesta';
  END IF;

  IF v_proposal.status NOT IN ('sent','viewed','accepted') THEN
    RAISE EXCEPTION 'La propuesta no esta disponible para confirmacion (estado=%)', v_proposal.status;
  END IF;

  SELECT id INTO v_existing_order_id
  FROM public.concierge_orders
  WHERE source_proposal_id = _proposal_id
    AND status NOT IN ('cancelled','expired','refunded')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN v_existing_order_id;
  END IF;

  INSERT INTO public.concierge_orders (
    user_id, source_kind, source_proposal_id, source_case_id,
    currency, status, editorial_title, editorial_summary, created_by
  )
  VALUES (
    v_case.traveler_user_id, 'concierge_proposal', v_proposal.id, v_case.id,
    COALESCE(v_proposal.currency, 'MXN'), 'awaiting_payment',
    COALESCE(v_case.title, 'Tu viaje en el Oriente Maya'),
    v_proposal.summary, v_uid
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT
      pi.amount_cents, pi.currency, pi.notes, pi.position,
      cr.title AS request_title, cr.product_id,
      cq.business_id
    FROM public.concierge_proposal_items pi
    JOIN public.concierge_quotes cq        ON cq.id = pi.quote_id
    JOIN public.concierge_case_requests cr ON cr.id = pi.request_id
    WHERE pi.proposal_id = _proposal_id
    ORDER BY pi.position
  LOOP
    INSERT INTO public.concierge_order_items (
      order_id, entity_kind, entity_id, business_id,
      title, description, quantity, unit_amount, currency,
      commission_bps, commission_source
    ) VALUES (
      v_order_id,
      CASE WHEN v_item.product_id IS NOT NULL THEN 'product' ELSE 'custom' END,
      v_item.product_id, v_item.business_id,
      v_item.request_title, v_item.notes,
      1, v_item.amount_cents, COALESCE(v_item.currency, 'MXN'),
      1000, 'concierge'
    );
  END LOOP;

  UPDATE public.concierge_proposals
     SET status = 'accepted',
         responded_at = COALESCE(responded_at, now()),
         updated_at = now()
   WHERE id = _proposal_id AND status <> 'accepted';

  INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
  VALUES (v_order_id, 'created_from_proposal', v_uid,
          jsonb_build_object('proposal_id', _proposal_id, 'case_id', v_case.id));

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.concierge_create_order_from_proposal(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.concierge_create_order_from_proposal(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.concierge_create_direct_sale_order(
  _product_id uuid,
  _quantity integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_product record;
  v_existing_order_id uuid;
  v_order_id uuid;
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

  INSERT INTO public.concierge_orders (
    user_id, source_kind, currency, status,
    editorial_title, editorial_summary, created_by
  ) VALUES (
    v_uid, 'direct_sale',
    COALESCE(v_product.direct_sale_currency, 'MXN'),
    'awaiting_payment',
    v_product.name, v_product.description, v_uid
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
$$;

REVOKE ALL ON FUNCTION public.concierge_create_direct_sale_order(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.concierge_create_direct_sale_order(uuid, integer) TO authenticated;


DROP POLICY IF EXISTS "traveler_cancels_own_order" ON public.concierge_orders;
CREATE POLICY "traveler_cancels_own_order"
  ON public.concierge_orders
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft','awaiting_payment'))
  WITH CHECK (auth.uid() = user_id AND status IN ('draft','awaiting_payment','cancelled'));


ALTER TABLE public.concierge_orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'concierge_orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_orders';
  END IF;
END $$;
