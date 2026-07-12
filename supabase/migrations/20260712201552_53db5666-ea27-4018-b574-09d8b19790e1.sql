-- =============================================================================
-- CV4.1 · Modelo de venta unificado (Checkout Concierge)
-- Alcance: soporta (a) órdenes derivadas de concierge_proposals aceptadas y
--         (b) venta directa de experiencias/productos marcados explícitamente.
-- Sin integración de proveedor de pago aún (eso es CV4.2). Solo el modelo.
-- =============================================================================

-- 1) Extender productos con control de venta directa (opt-in por empresa)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS direct_sale_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS direct_sale_price_amount integer,           -- en centavos
  ADD COLUMN IF NOT EXISTS direct_sale_currency text DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS direct_sale_commission_bps integer,         -- basis points (100 = 1%)
  ADD COLUMN IF NOT EXISTS direct_sale_cancellation_policy text,
  ADD COLUMN IF NOT EXISTS direct_sale_terms text,
  ADD COLUMN IF NOT EXISTS direct_sale_min_lead_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS direct_sale_max_quantity integer;

-- Validación coherente: si direct_sale_enabled, precio y comisión requeridos
CREATE OR REPLACE FUNCTION public._cv41_validate_direct_sale()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv41_validate_direct_sale ON public.products;
CREATE TRIGGER trg_cv41_validate_direct_sale
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public._cv41_validate_direct_sale();

-- 2) Folio VMX-XXXXXX
CREATE OR REPLACE FUNCTION public._cv41_generate_folio()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'VMX-';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3) Órdenes (concierge_orders)
CREATE TABLE IF NOT EXISTS public.concierge_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL UNIQUE,

  -- Traveler
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  traveler_email text,
  traveler_name text,
  traveler_phone text,
  traveler_locale text DEFAULT 'es',

  -- Origen: 'concierge_proposal' o 'direct_sale'
  source_kind text NOT NULL CHECK (source_kind IN ('concierge_proposal','direct_sale')),
  source_proposal_id uuid REFERENCES public.concierge_proposals(id) ON DELETE SET NULL,
  source_case_id uuid REFERENCES public.concierge_cases(id) ON DELETE SET NULL,
  travel_plan_id uuid REFERENCES public.travel_plans(id) ON DELETE SET NULL,

  -- Totales (centavos)
  currency text NOT NULL DEFAULT 'MXN',
  subtotal_amount integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,

  -- Comisión total calculada al momento de confirmar
  commission_amount integer NOT NULL DEFAULT 0,

  -- Estado interno
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','awaiting_payment','paid','fulfilled','cancelled','refunded','expired')),

  -- Pago (se llenará en CV4.2)
  payment_provider text,
  payment_provider_intent_id text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  expires_at timestamptz,

  -- Snapshot editorial visible al viajero (título del viaje, resumen)
  editorial_title text,
  editorial_summary text,
  destination_name text DEFAULT 'Oriente Maya de Yucatán',

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,

  CONSTRAINT cv41_source_coherent CHECK (
    (source_kind = 'concierge_proposal' AND source_proposal_id IS NOT NULL)
    OR (source_kind = 'direct_sale' AND source_proposal_id IS NULL)
  )
);

GRANT SELECT, INSERT, UPDATE ON public.concierge_orders TO authenticated;
GRANT ALL ON public.concierge_orders TO service_role;

ALTER TABLE public.concierge_orders ENABLE ROW LEVEL SECURITY;

-- Viajero ve sus propias órdenes
CREATE POLICY "traveler_reads_own_orders"
  ON public.concierge_orders FOR SELECT
  USING (auth.uid() = user_id);

-- Admin/founder/concierge asignado ven todo su ámbito
CREATE POLICY "ops_reads_orders"
  ON public.concierge_orders FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'concierge')
    OR public.has_role(auth.uid(), 'concierge_lead')
  );

-- Empresas leen órdenes que incluyen sus productos (via items) — vía función,
-- no política directa (evitar joins recursivos costosos). Aquí sólo la puerta:
CREATE POLICY "service_role_full_orders"
  ON public.concierge_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.concierge_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.concierge_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_proposal ON public.concierge_orders(source_proposal_id);
CREATE INDEX IF NOT EXISTS idx_orders_case ON public.concierge_orders(source_case_id);
CREATE INDEX IF NOT EXISTS idx_orders_folio ON public.concierge_orders(folio);

-- Folio autogenerado + updated_at
CREATE OR REPLACE FUNCTION public._cv41_orders_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  candidate text;
  tries int := 0;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    LOOP
      candidate := public._cv41_generate_folio();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.concierge_orders WHERE folio = candidate);
      tries := tries + 1;
      IF tries > 10 THEN RAISE EXCEPTION 'No se pudo generar folio único'; END IF;
    END LOOP;
    NEW.folio := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv41_orders_before_insert ON public.concierge_orders;
CREATE TRIGGER trg_cv41_orders_before_insert
  BEFORE INSERT ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION public._cv41_orders_before_insert();

CREATE OR REPLACE FUNCTION public._cv41_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_cv41_orders_updated ON public.concierge_orders;
CREATE TRIGGER trg_cv41_orders_updated
  BEFORE UPDATE ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION public._cv41_touch_updated_at();

-- 4) Items snapshot (agnósticos al tipo)
CREATE TABLE IF NOT EXISTS public.concierge_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.concierge_orders(id) ON DELETE CASCADE,

  -- Snapshot editorial (inmutable después de paid)
  entity_kind text NOT NULL CHECK (entity_kind IN (
    'product','experience','tour','hotel_night','restaurant_booking','event','custom'
  )),
  entity_id uuid,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  image_url text,

  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount integer NOT NULL CHECK (unit_amount >= 0),
  currency text NOT NULL DEFAULT 'MXN',
  subtotal_amount integer NOT NULL DEFAULT 0,

  -- Comisión propia por ítem (fuente = producto si direct_sale, o config concierge)
  commission_bps integer NOT NULL DEFAULT 0 CHECK (commission_bps BETWEEN 0 AND 10000),
  commission_amount integer NOT NULL DEFAULT 0,
  commission_source text NOT NULL DEFAULT 'concierge'
    CHECK (commission_source IN ('direct_sale','concierge','override')),

  -- Datos operativos
  scheduled_for timestamptz,
  guest_notes text,
  fulfillment_status text NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending','confirmed','delivered','cancelled')),

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.concierge_order_items TO authenticated;
GRANT ALL ON public.concierge_order_items TO service_role;

ALTER TABLE public.concierge_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traveler_reads_own_order_items"
  ON public.concierge_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.concierge_orders o
    WHERE o.id = order_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "ops_reads_order_items"
  ON public.concierge_order_items FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'concierge')
    OR public.has_role(auth.uid(), 'concierge_lead')
  );

-- Empresa dueña ve items que la involucran
CREATE POLICY "business_reads_own_items"
  ON public.concierge_order_items FOR SELECT
  USING (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = concierge_order_items.business_id
        AND bu.user_id = auth.uid()
        AND bu.status = 'active'
    )
  );

CREATE POLICY "service_role_full_items"
  ON public.concierge_order_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.concierge_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_business ON public.concierge_order_items(business_id);
CREATE INDEX IF NOT EXISTS idx_order_items_entity ON public.concierge_order_items(entity_kind, entity_id);

DROP TRIGGER IF EXISTS trg_cv41_items_updated ON public.concierge_order_items;
CREATE TRIGGER trg_cv41_items_updated
  BEFORE UPDATE ON public.concierge_order_items
  FOR EACH ROW EXECUTE FUNCTION public._cv41_touch_updated_at();

-- Recalcular subtotal + comisión del item
CREATE OR REPLACE FUNCTION public._cv41_items_compute()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.subtotal_amount := NEW.unit_amount * NEW.quantity;
  NEW.commission_amount := (NEW.subtotal_amount * NEW.commission_bps) / 10000;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv41_items_compute ON public.concierge_order_items;
CREATE TRIGGER trg_cv41_items_compute
  BEFORE INSERT OR UPDATE ON public.concierge_order_items
  FOR EACH ROW EXECUTE FUNCTION public._cv41_items_compute();

-- 5) Eventos de orden (audit trail)
CREATE TABLE IF NOT EXISTS public.concierge_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.concierge_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.concierge_order_events TO authenticated;
GRANT ALL ON public.concierge_order_events TO service_role;

ALTER TABLE public.concierge_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_reads_order_events"
  ON public.concierge_order_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'concierge')
    OR public.has_role(auth.uid(), 'concierge_lead')
    OR EXISTS (
      SELECT 1 FROM public.concierge_orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_full_events"
  ON public.concierge_order_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.concierge_order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_type ON public.concierge_order_events(event_type);

-- 6) Recalcular totales de la orden al cambiar items
CREATE OR REPLACE FUNCTION public._cv41_recompute_order_totals()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_subtotal integer;
  v_commission integer;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(subtotal_amount),0), COALESCE(SUM(commission_amount),0)
    INTO v_subtotal, v_commission
  FROM public.concierge_order_items
  WHERE order_id = v_order_id;

  UPDATE public.concierge_orders
     SET subtotal_amount = v_subtotal,
         commission_amount = v_commission,
         total_amount = v_subtotal - COALESCE(discount_amount,0) + COALESCE(tax_amount,0),
         updated_at = now()
   WHERE id = v_order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv41_recompute_order_totals ON public.concierge_order_items;
CREATE TRIGGER trg_cv41_recompute_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.concierge_order_items
  FOR EACH ROW EXECUTE FUNCTION public._cv41_recompute_order_totals();
