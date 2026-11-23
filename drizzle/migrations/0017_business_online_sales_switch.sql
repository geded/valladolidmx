CREATE TABLE public.business_online_sales (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  modes text[] NOT NULL DEFAULT '{}'::text[],
  channels text[] NOT NULL DEFAULT '{}'::text[],
  delivery_modes text[] NOT NULL DEFAULT '{recoger}'::text[],
  booking_modes text[] NOT NULL DEFAULT '{confirmacion}'::text[],
  calendar_sources text[] NOT NULL DEFAULT '{manual}'::text[],
  note text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_online_sales_modes_ck CHECK (modes <@ ARRAY['tienda','pedidos','reservas','salidas']::text[]),
  CONSTRAINT business_online_sales_channels_ck CHECK (channels <@ ARRAY['pagina','alux_pagina','whatsapp']::text[]),
  CONSTRAINT business_online_sales_delivery_ck CHECK (delivery_modes <@ ARRAY['recoger','envio']::text[]),
  CONSTRAINT business_online_sales_booking_ck CHECK (booking_modes <@ ARRAY['confirmacion','inmediata']::text[]),
  CONSTRAINT business_online_sales_calendar_ck CHECK (calendar_sources <@ ARRAY['manual','ical']::text[])
);

GRANT SELECT ON public.business_online_sales TO authenticated;
GRANT ALL ON public.business_online_sales TO service_role;
ALTER TABLE public.business_online_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Online sales visible to staff and business team"
  ON public.business_online_sales FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR public.has_business_access(auth.uid(), business_id, 'viewer'::public.business_user_role)
  );

CREATE TRIGGER trg_business_online_sales_updated_at
  BEFORE UPDATE ON public.business_online_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Qué forma de venta corresponde a cada tipo de producto.
CREATE OR REPLACE FUNCTION public.online_sale_mode_for(_type public.product_type)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _type::text
    WHEN 'experiencia' THEN 'experiencias'
    WHEN 'artesanal' THEN 'tienda'
    WHEN 'restaurante' THEN 'pedidos'
    WHEN 'hotel' THEN 'reservas'
    ELSE 'salidas'
  END
$$;

-- Experiencias: siempre como hoy. Lo demás: sólo si la empresa tiene ese modo
-- (y, si se pide, ese canal) activado por Administración.
CREATE OR REPLACE FUNCTION public.business_online_sale_allows(
  _business_id uuid, _product_type public.product_type, _channel text DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.online_sale_mode_for(_product_type) = 'experiencias'
    OR EXISTS (
      SELECT 1 FROM public.business_online_sales s
       WHERE s.business_id = _business_id
         AND s.enabled
         AND public.online_sale_mode_for(_product_type) = ANY (s.modes)
         AND (_channel IS NULL OR _channel = ANY (s.channels))
    )
$$;
GRANT EXECUTE ON FUNCTION public.online_sale_mode_for(public.product_type) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.business_online_sale_allows(uuid, public.product_type, text) TO anon, authenticated, service_role;

-- Sólo Administración cambia el interruptor. Valores del piloto: recoger,
-- reserva con confirmación y calendario manual (los demás quedan apagados).
CREATE OR REPLACE FUNCTION public.admin_set_business_online_sales(
  _business_id uuid, _enabled boolean, _modes text[], _channels text[], _note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'business_not_found';
  END IF;
  IF NOT (COALESCE(_modes, '{}') <@ ARRAY['tienda','pedidos','reservas','salidas']::text[]) THEN
    RAISE EXCEPTION 'invalid_online_sales_mode';
  END IF;
  IF NOT (COALESCE(_channels, '{}') <@ ARRAY['pagina','alux_pagina','whatsapp']::text[]) THEN
    RAISE EXCEPTION 'invalid_online_sales_channel';
  END IF;
  IF _enabled AND (cardinality(COALESCE(_modes, '{}')) = 0 OR cardinality(COALESCE(_channels, '{}')) = 0) THEN
    RAISE EXCEPTION 'online_sales_needs_mode_and_channel';
  END IF;

  INSERT INTO public.business_online_sales AS s (business_id, enabled, modes, channels, note, updated_by)
  VALUES (_business_id, _enabled, COALESCE(_modes, '{}'), COALESCE(_channels, '{}'),
          NULLIF(btrim(COALESCE(_note, '')), ''), auth.uid())
  ON CONFLICT (business_id) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        modes = EXCLUDED.modes,
        channels = EXCLUDED.channels,
        note = EXCLUDED.note,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  INSERT INTO public.content_audit_log (entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('business', _business_id,
          CASE WHEN _enabled THEN 'online_sales_enabled' ELSE 'online_sales_disabled' END,
          auth.uid(),
          jsonb_build_object('modes', COALESCE(_modes, '{}'), 'channels', COALESCE(_channels, '{}')));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_business_online_sales(uuid, boolean, text[], text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_business_online_sales(uuid, boolean, text[], text[], text) TO authenticated, service_role;

-- Lo que ya vendía en línea (fuera de experiencias) queda activado tal cual.
INSERT INTO public.business_online_sales (business_id, enabled, modes, channels, note)
SELECT p.business_id,
       true,
       array_agg(DISTINCT public.online_sale_mode_for(p.product_type)),
       CASE WHEN bool_or(p.product_type::text = 'artesanal')
            THEN ARRAY['pagina','alux_pagina']::text[]
            ELSE ARRAY['pagina']::text[] END,
       'Activada al crear el interruptor: ya vendía en línea.'
  FROM public.products p
 WHERE p.direct_sale_enabled
   AND p.deleted_at IS NULL
   AND p.business_id IS NOT NULL
   AND public.online_sale_mode_for(p.product_type) <> 'experiencias'
 GROUP BY p.business_id
ON CONFLICT (business_id) DO NOTHING;

-- Activar la venta de un producto exige la empresa activada para su modo.
CREATE OR REPLACE FUNCTION public._cv41_validate_direct_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.direct_sale_enabled IS TRUE THEN
    IF NEW.direct_sale_price_amount IS NULL OR NEW.direct_sale_price_amount <= 0 THEN
      RAISE EXCEPTION 'direct_sale_price_amount es obligatorio (>0) cuando direct_sale_enabled = true';
    END IF;
    IF NEW.direct_sale_commission_bps IS NULL OR NEW.direct_sale_commission_bps < 0 OR NEW.direct_sale_commission_bps > 10000 THEN
      RAISE EXCEPTION 'direct_sale_commission_bps debe estar entre 0 y 10000';
    END IF;
    IF NEW.direct_sale_currency IS NULL THEN
      NEW.direct_sale_currency := 'MXN';
    END IF;
    IF (TG_OP = 'INSERT' OR OLD.direct_sale_enabled IS DISTINCT FROM true)
       AND NOT public.business_online_sale_allows(NEW.business_id, NEW.product_type) THEN
      RAISE EXCEPTION 'online_sales_not_enabled_for_business';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- El cobro también respeta el interruptor de la empresa.
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
    p.id, p.name, p.description, p.business_id, p.slug, p.product_type,
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

  IF NOT public.business_online_sale_allows(v_product.business_id, v_product.product_type) THEN
    RAISE EXCEPTION 'La venta en linea no esta activa para esta empresa';
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