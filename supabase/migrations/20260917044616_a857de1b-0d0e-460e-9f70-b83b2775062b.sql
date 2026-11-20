-- ============ C3 · Calendario e inventario de experiencias ============

CREATE TABLE public.commerce_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Merida',
  weekdays SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  start_times TIME[] NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity_total INTEGER NOT NULL DEFAULT 10,
  capacity_reservable INTEGER,
  min_participants INTEGER NOT NULL DEFAULT 1,
  max_participants INTEGER,
  min_lead_hours INTEGER NOT NULL DEFAULT 24,
  sale_horizon_days INTEGER NOT NULL DEFAULT 120,
  cutoff_minutes INTEGER NOT NULL DEFAULT 0,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_schedule_capacity_positive CHECK (capacity_total > 0),
  CONSTRAINT commerce_schedule_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT commerce_schedule_times_present CHECK (array_length(start_times, 1) > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_schedule_templates TO authenticated;
GRANT ALL ON public.commerce_schedule_templates TO service_role;
ALTER TABLE public.commerce_schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.commerce_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.commerce_schedule_templates(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Merida',
  capacity_total INTEGER NOT NULL,
  capacity_reservable INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_departures_status_valid CHECK (status IN ('scheduled','closed','cancelled')),
  CONSTRAINT commerce_departures_capacity_valid CHECK (capacity_total > 0 AND capacity_reservable >= 0 AND capacity_reservable <= capacity_total),
  CONSTRAINT commerce_departures_range_valid CHECK (ends_at > starts_at),
  CONSTRAINT commerce_departures_unique_slot UNIQUE (product_id, starts_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_departures TO authenticated;
GRANT ALL ON public.commerce_departures TO service_role;
ALTER TABLE public.commerce_departures ENABLE ROW LEVEL SECURITY;

CREATE INDEX commerce_departures_product_start_idx ON public.commerce_departures (product_id, starts_at);
CREATE INDEX commerce_departures_start_idx ON public.commerce_departures (starts_at);

CREATE TABLE public.commerce_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_blackouts_scope CHECK (product_id IS NOT NULL OR business_id IS NOT NULL),
  CONSTRAINT commerce_blackouts_range_valid CHECK (ends_at > starts_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commerce_blackouts TO authenticated;
GRANT ALL ON public.commerce_blackouts TO service_role;
ALTER TABLE public.commerce_blackouts ENABLE ROW LEVEL SECURITY;

CREATE INDEX commerce_blackouts_product_idx ON public.commerce_blackouts (product_id, starts_at, ends_at);

CREATE TABLE public.commerce_inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES public.commerce_departures(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_inventory_adjustments_delta_nonzero CHECK (delta <> 0)
);

GRANT SELECT ON public.commerce_inventory_adjustments TO authenticated;
GRANT ALL ON public.commerce_inventory_adjustments TO service_role;
ALTER TABLE public.commerce_inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE INDEX commerce_inventory_adjustments_departure_idx ON public.commerce_inventory_adjustments (departure_id);

CREATE TABLE public.commerce_reservation_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES public.commerce_departures(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  expires_at TIMESTAMPTZ NOT NULL,
  order_id UUID REFERENCES public.concierge_orders(id) ON DELETE SET NULL,
  traveler_user_id UUID,
  idempotency_key TEXT NOT NULL,
  released_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commerce_holds_quantity_positive CHECK (quantity > 0),
  CONSTRAINT commerce_holds_status_valid CHECK (status IN ('held','confirmed','released','expired')),
  CONSTRAINT commerce_holds_idempotency_unique UNIQUE (idempotency_key)
);

GRANT SELECT ON public.commerce_reservation_holds TO authenticated;
GRANT ALL ON public.commerce_reservation_holds TO service_role;
ALTER TABLE public.commerce_reservation_holds ENABLE ROW LEVEL SECURITY;

CREATE INDEX commerce_holds_departure_status_idx ON public.commerce_reservation_holds (departure_id, status);
CREATE INDEX commerce_holds_expiry_idx ON public.commerce_reservation_holds (status, expires_at);

-- ---------- Helper: ¿el usuario puede ver el inventario de este producto? ----------
CREATE OR REPLACE FUNCTION public.commerce_can_view_product_inventory(_user_id UUID, _product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_editor_or_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.business_users bu ON bu.business_id = p.business_id
      WHERE p.id = _product_id
        AND bu.user_id = _user_id
        AND bu.status = 'active'
    )
  )
$$;

-- ---------- Políticas ----------
CREATE POLICY "Staff administra patrones de salida"
ON public.commerce_schedule_templates FOR ALL TO authenticated
USING (public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "Equipo de la empresa consulta sus patrones"
ON public.commerce_schedule_templates FOR SELECT TO authenticated
USING (public.commerce_can_view_product_inventory(auth.uid(), product_id));

CREATE POLICY "Staff administra salidas"
ON public.commerce_departures FOR ALL TO authenticated
USING (public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "Equipo de la empresa consulta sus salidas"
ON public.commerce_departures FOR SELECT TO authenticated
USING (public.commerce_can_view_product_inventory(auth.uid(), product_id));

CREATE POLICY "Staff administra cierres de venta"
ON public.commerce_blackouts FOR ALL TO authenticated
USING (public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "Equipo de la empresa consulta sus cierres"
ON public.commerce_blackouts FOR SELECT TO authenticated
USING (
  (product_id IS NOT NULL AND public.commerce_can_view_product_inventory(auth.uid(), product_id))
  OR (business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.business_id = commerce_blackouts.business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
  ))
);

CREATE POLICY "Staff consulta ajustes de cupo"
ON public.commerce_inventory_adjustments FOR SELECT TO authenticated
USING (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "Staff consulta apartados"
ON public.commerce_reservation_holds FOR SELECT TO authenticated
USING (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "Viajero consulta sus apartados"
ON public.commerce_reservation_holds FOR SELECT TO authenticated
USING (traveler_user_id = auth.uid());

-- ---------- updated_at ----------
CREATE TRIGGER commerce_schedule_templates_touch
BEFORE UPDATE ON public.commerce_schedule_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER commerce_departures_touch
BEFORE UPDATE ON public.commerce_departures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER commerce_blackouts_touch
BEFORE UPDATE ON public.commerce_blackouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER commerce_reservation_holds_touch
BEFORE UPDATE ON public.commerce_reservation_holds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Disponibilidad ----------
CREATE OR REPLACE FUNCTION public.commerce_departure_availability(_departure_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    d.capacity_reservable
      + COALESCE((SELECT SUM(a.delta) FROM public.commerce_inventory_adjustments a WHERE a.departure_id = d.id), 0)
      - COALESCE((
          SELECT SUM(h.quantity)
          FROM public.commerce_reservation_holds h
          WHERE h.departure_id = d.id
            AND (h.status = 'confirmed' OR (h.status = 'held' AND h.expires_at > now()))
        ), 0)
  )::INTEGER
  FROM public.commerce_departures d
  WHERE d.id = _departure_id
$$;

-- ---------- Generación de salidas desde un patrón ----------
CREATE OR REPLACE FUNCTION public.commerce_generate_departures(_template_id UUID, _until DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.commerce_schedule_templates%ROWTYPE;
  v_until DATE;
  v_day DATE;
  v_time TIME;
  v_start TIMESTAMPTZ;
  v_created INTEGER := 0;
BEGIN
  IF NOT public.is_editor_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO t FROM public.commerce_schedule_templates WHERE id = _template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template_not_found'; END IF;
  IF NOT t.active THEN RAISE EXCEPTION 'template_inactive'; END IF;

  v_until := LEAST(
    COALESCE(_until, (CURRENT_DATE + t.sale_horizon_days)),
    COALESCE(t.valid_until, (CURRENT_DATE + t.sale_horizon_days)),
    CURRENT_DATE + t.sale_horizon_days
  );

  v_day := GREATEST(t.valid_from, CURRENT_DATE);

  WHILE v_day <= v_until LOOP
    IF EXTRACT(DOW FROM v_day)::SMALLINT = ANY (t.weekdays) THEN
      FOREACH v_time IN ARRAY t.start_times LOOP
        v_start := (v_day + v_time) AT TIME ZONE t.timezone;

        IF v_start > now() + make_interval(hours => t.min_lead_hours) THEN
          INSERT INTO public.commerce_departures (
            product_id, template_id, starts_at, ends_at, timezone,
            capacity_total, capacity_reservable, created_by
          )
          VALUES (
            t.product_id, t.id, v_start,
            v_start + make_interval(mins => t.duration_minutes), t.timezone,
            t.capacity_total, COALESCE(t.capacity_reservable, t.capacity_total), auth.uid()
          )
          ON CONFLICT (product_id, starts_at) DO NOTHING;

          IF FOUND THEN v_created := v_created + 1; END IF;
        END IF;
      END LOOP;
    END IF;
    v_day := v_day + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_generate_departures(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_generate_departures(UUID, DATE) TO authenticated, service_role;

-- ---------- Ajuste manual de cupo (con motivo) ----------
CREATE OR REPLACE FUNCTION public.commerce_departure_adjust(_departure_id UUID, _delta INTEGER, _reason TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_editor_or_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'delta_required'; END IF;

  INSERT INTO public.commerce_inventory_adjustments (departure_id, delta, reason, created_by)
  VALUES (_departure_id, _delta, btrim(_reason), auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_departure_adjust(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_departure_adjust(UUID, INTEGER, TEXT) TO authenticated, service_role;

-- ---------- Estado de una salida ----------
CREATE OR REPLACE FUNCTION public.commerce_departure_set_status(_departure_id UUID, _status TEXT, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_editor_or_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('scheduled','closed','cancelled') THEN RAISE EXCEPTION 'invalid_status'; END IF;

  UPDATE public.commerce_departures
  SET status = _status,
      notes = COALESCE(NULLIF(btrim(COALESCE(_reason, '')), ''), notes)
  WHERE id = _departure_id;

  IF _status = 'cancelled' THEN
    UPDATE public.commerce_reservation_holds
    SET status = 'released', released_reason = COALESCE(_reason, 'salida cancelada')
    WHERE departure_id = _departure_id AND status = 'held';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_departure_set_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_departure_set_status(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ---------- Apartado atómico (anti sobreventa) ----------
CREATE OR REPLACE FUNCTION public.commerce_hold_create(
  _departure_id UUID,
  _quantity INTEGER,
  _idempotency_key TEXT,
  _ttl_minutes INTEGER DEFAULT 20,
  _traveler_user_id UUID DEFAULT NULL
)
RETURNS public.commerce_reservation_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.commerce_departures%ROWTYPE;
  v_existing public.commerce_reservation_holds%ROWTYPE;
  v_available INTEGER;
  v_hold public.commerce_reservation_holds%ROWTYPE;
BEGIN
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN RAISE EXCEPTION 'idempotency_key_required'; END IF;

  SELECT * INTO v_existing FROM public.commerce_reservation_holds WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN v_existing; END IF;

  -- Serializa el cupo de esta salida
  SELECT * INTO d FROM public.commerce_departures WHERE id = _departure_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'departure_not_found'; END IF;
  IF d.status <> 'scheduled' THEN RAISE EXCEPTION 'departure_not_open'; END IF;
  IF d.starts_at <= now() THEN RAISE EXCEPTION 'departure_past'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.commerce_blackouts b
    JOIN public.products p ON p.id = d.product_id
    WHERE (b.product_id = d.product_id OR b.business_id = p.business_id)
      AND d.starts_at >= b.starts_at
      AND d.starts_at < b.ends_at
  ) THEN
    RAISE EXCEPTION 'departure_blacked_out';
  END IF;

  -- Libera apartados vencidos de esta salida antes de contar
  UPDATE public.commerce_reservation_holds
  SET status = 'expired', released_reason = 'vencido'
  WHERE departure_id = _departure_id AND status = 'held' AND expires_at <= now();

  v_available := public.commerce_departure_availability(_departure_id);
  IF v_available < _quantity THEN RAISE EXCEPTION 'insufficient_capacity'; END IF;

  INSERT INTO public.commerce_reservation_holds (
    departure_id, product_id, quantity, expires_at, traveler_user_id, idempotency_key
  )
  VALUES (
    _departure_id, d.product_id, _quantity,
    now() + make_interval(mins => GREATEST(COALESCE(_ttl_minutes, 20), 1)),
    _traveler_user_id, btrim(_idempotency_key)
  )
  RETURNING * INTO v_hold;

  RETURN v_hold;
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_hold_create(UUID, INTEGER, TEXT, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_hold_create(UUID, INTEGER, TEXT, INTEGER, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.commerce_hold_confirm(_hold_id UUID, _order_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commerce_reservation_holds
  SET status = 'confirmed', order_id = COALESCE(_order_id, order_id), expires_at = GREATEST(expires_at, now())
  WHERE id = _hold_id AND status IN ('held','confirmed');

  IF NOT FOUND THEN RAISE EXCEPTION 'hold_not_confirmable'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_hold_confirm(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_hold_confirm(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.commerce_hold_release(_hold_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commerce_reservation_holds
  SET status = 'released', released_reason = COALESCE(_reason, 'liberado')
  WHERE id = _hold_id AND status = 'held';
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_hold_release(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_hold_release(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.commerce_holds_expire()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.commerce_reservation_holds
  SET status = 'expired', released_reason = 'vencido'
  WHERE status = 'held' AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.commerce_holds_expire() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_holds_expire() TO authenticated, service_role;

-- ---------- Listado de salidas con disponibilidad ----------
CREATE OR REPLACE FUNCTION public.commerce_list_departures(
  _product_id UUID,
  _from TIMESTAMPTZ DEFAULT NULL,
  _to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  timezone TEXT,
  status TEXT,
  capacity_total INTEGER,
  capacity_reservable INTEGER,
  adjustments INTEGER,
  held INTEGER,
  confirmed INTEGER,
  available INTEGER,
  blacked_out BOOLEAN,
  notes TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.starts_at,
    d.ends_at,
    d.timezone,
    d.status,
    d.capacity_total,
    d.capacity_reservable,
    COALESCE((SELECT SUM(a.delta)::INTEGER FROM public.commerce_inventory_adjustments a WHERE a.departure_id = d.id), 0),
    COALESCE((SELECT SUM(h.quantity)::INTEGER FROM public.commerce_reservation_holds h WHERE h.departure_id = d.id AND h.status = 'held' AND h.expires_at > now()), 0),
    COALESCE((SELECT SUM(h.quantity)::INTEGER FROM public.commerce_reservation_holds h WHERE h.departure_id = d.id AND h.status = 'confirmed'), 0),
    public.commerce_departure_availability(d.id),
    EXISTS (
      SELECT 1 FROM public.commerce_blackouts b
      LEFT JOIN public.products p ON p.id = d.product_id
      WHERE (b.product_id = d.product_id OR b.business_id = p.business_id)
        AND d.starts_at >= b.starts_at AND d.starts_at < b.ends_at
    ),
    d.notes
  FROM public.commerce_departures d
  WHERE d.product_id = _product_id
    AND public.commerce_can_view_product_inventory(auth.uid(), _product_id)
    AND d.starts_at >= COALESCE(_from, now() - interval '1 day')
    AND d.starts_at <= COALESCE(_to, now() + interval '180 days')
  ORDER BY d.starts_at
$$;

REVOKE ALL ON FUNCTION public.commerce_list_departures(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commerce_list_departures(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;