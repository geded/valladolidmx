-- Etapa 5 — Pagos (Stripe + abstracción de proveedor)

-- 1. Columnas aditivas en orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('unpaid','processing','paid','failed','refunded'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_intent_unique
  ON public.orders (payment_provider, payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

-- 2. payment_events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT payment_events_unique UNIQUE (provider, provider_event_id)
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_select_own" ON public.payment_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payment_events.order_id AND o.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_payment_events_order
  ON public.payment_events (order_id, received_at DESC);

-- 3. RPC order_mark_paid (idempotente, sólo service_role)
CREATE OR REPLACE FUNCTION public.order_mark_paid(
  p_order_id UUID,
  p_provider TEXT,
  p_intent_id TEXT,
  p_event_id TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN v_order;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      payment_provider = COALESCE(payment_provider, p_provider),
      payment_intent_id = COALESCE(payment_intent_id, p_intent_id),
      status = CASE WHEN status IN ('cart','pending') THEN 'confirmed'::public.order_status ELSE status END,
      paid_at = now(),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.order_events (order_id, event_type, payload)
  VALUES (
    p_order_id,
    'payment_succeeded',
    jsonb_build_object('provider', p_provider, 'intent_id', p_intent_id, 'event_id', p_event_id)
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.order_mark_paid(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_mark_paid(UUID, TEXT, TEXT, TEXT) TO service_role;

-- 4. RPC order_mark_payment_failed
CREATE OR REPLACE FUNCTION public.order_mark_payment_failed(
  p_order_id UUID,
  p_provider TEXT,
  p_intent_id TEXT,
  p_event_id TEXT,
  p_reason TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN v_order;
  END IF;

  UPDATE public.orders
  SET payment_status = 'failed',
      payment_provider = COALESCE(payment_provider, p_provider),
      payment_intent_id = COALESCE(payment_intent_id, p_intent_id),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.order_events (order_id, event_type, payload)
  VALUES (
    p_order_id,
    'payment_failed',
    jsonb_build_object('provider', p_provider, 'intent_id', p_intent_id, 'event_id', p_event_id, 'reason', p_reason)
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.order_mark_payment_failed(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_mark_payment_failed(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;