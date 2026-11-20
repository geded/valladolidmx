CREATE TABLE public.product_direct_sale_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  request_note text,
  proposed_price_amount integer,
  currency text NOT NULL DEFAULT 'MXN',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  commission_bps integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_direct_sale_requests_status_chk
    CHECK (status IN ('pending','approved','rejected','cancelled','revoked')),
  CONSTRAINT product_direct_sale_requests_commission_chk
    CHECK (commission_bps IS NULL OR (commission_bps >= 0 AND commission_bps <= 10000))
);

CREATE INDEX product_direct_sale_requests_product_idx
  ON public.product_direct_sale_requests (product_id, requested_at DESC);
CREATE INDEX product_direct_sale_requests_status_idx
  ON public.product_direct_sale_requests (status, requested_at DESC);
CREATE UNIQUE INDEX product_direct_sale_requests_one_pending
  ON public.product_direct_sale_requests (product_id)
  WHERE status = 'pending';

GRANT SELECT ON public.product_direct_sale_requests TO authenticated;
GRANT ALL ON public.product_direct_sale_requests TO service_role;

ALTER TABLE public.product_direct_sale_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_sale_requests_read_business"
  ON public.product_direct_sale_requests FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer'));

CREATE POLICY "direct_sale_requests_read_staff"
  ON public.product_direct_sale_requests FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
    OR public.has_role(auth.uid(), 'concierge')
  );

CREATE OR REPLACE FUNCTION public._product_direct_sale_requests_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_direct_sale_requests_touch
  BEFORE UPDATE ON public.product_direct_sale_requests
  FOR EACH ROW EXECUTE FUNCTION public._product_direct_sale_requests_touch();

-- La empresa solicita la venta en línea (no la activa)
CREATE OR REPLACE FUNCTION public.product_direct_sale_request_submit(
  _product_id uuid,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _price integer;
  _currency text;
  _enabled boolean;
  _id uuid;
BEGIN
  SELECT business_id, direct_sale_price_amount, COALESCE(direct_sale_currency,'MXN'), direct_sale_enabled
    INTO _business_id, _price, _currency, _enabled
    FROM public.products
   WHERE id = _product_id AND deleted_at IS NULL;

  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF NOT public.has_business_access(auth.uid(), _business_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden_business_access';
  END IF;

  IF _enabled THEN
    RAISE EXCEPTION 'direct_sale_already_enabled';
  END IF;

  IF _price IS NULL OR _price <= 0 THEN
    RAISE EXCEPTION 'direct_sale_price_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.product_direct_sale_requests
     WHERE product_id = _product_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'direct_sale_request_pending';
  END IF;

  INSERT INTO public.product_direct_sale_requests
    (product_id, business_id, requested_by, request_note, proposed_price_amount, currency)
  VALUES (_product_id, _business_id, auth.uid(), NULLIF(btrim(COALESCE(_note,'')), ''), _price, _currency)
  RETURNING id INTO _id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES ('product', _product_id, 'direct_sale_requested', auth.uid(),
          jsonb_build_object('request_id', _id, 'price_amount', _price, 'currency', _currency));

  RETURN _id;
END;
$$;

-- La empresa puede retirar su solicitud mientras esté pendiente
CREATE OR REPLACE FUNCTION public.product_direct_sale_request_cancel(
  _request_id uuid,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _product_id uuid;
BEGIN
  SELECT business_id, product_id INTO _business_id, _product_id
    FROM public.product_direct_sale_requests
   WHERE id = _request_id AND status = 'pending';

  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'direct_sale_request_not_pending';
  END IF;

  IF NOT public.has_business_access(auth.uid(), _business_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden_business_access';
  END IF;

  UPDATE public.product_direct_sale_requests
     SET status = 'cancelled',
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = NULLIF(btrim(COALESCE(_note,'')), '')
   WHERE id = _request_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES ('product', _product_id, 'direct_sale_request_cancelled', auth.uid(),
          jsonb_build_object('request_id', _request_id));
END;
$$;

-- Administración autoriza o rechaza y fija la comisión
CREATE OR REPLACE FUNCTION public.product_direct_sale_request_decide(
  _request_id uuid,
  _approve boolean,
  _commission_bps integer DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product_id uuid;
  _price integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT product_id INTO _product_id
    FROM public.product_direct_sale_requests
   WHERE id = _request_id AND status = 'pending';

  IF _product_id IS NULL THEN
    RAISE EXCEPTION 'direct_sale_request_not_pending';
  END IF;

  IF _approve THEN
    IF _commission_bps IS NULL OR _commission_bps < 0 OR _commission_bps > 10000 THEN
      RAISE EXCEPTION 'invalid_commission_bps';
    END IF;

    SELECT direct_sale_price_amount INTO _price FROM public.products WHERE id = _product_id;
    IF _price IS NULL OR _price <= 0 THEN
      RAISE EXCEPTION 'direct_sale_price_required';
    END IF;

    UPDATE public.products
       SET direct_sale_enabled = true,
           direct_sale_commission_bps = _commission_bps,
           updated_at = now()
     WHERE id = _product_id;
  END IF;

  UPDATE public.product_direct_sale_requests
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = NULLIF(btrim(COALESCE(_note,'')), ''),
         commission_bps = CASE WHEN _approve THEN _commission_bps ELSE commission_bps END
   WHERE id = _request_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES ('product', _product_id,
          CASE WHEN _approve THEN 'direct_sale_request_approved' ELSE 'direct_sale_request_rejected' END,
          auth.uid(),
          jsonb_build_object('request_id', _request_id, 'commission_bps', _commission_bps));
END;
$$;

-- Administración retira la autorización de venta en línea
CREATE OR REPLACE FUNCTION public.product_direct_sale_revoke(
  _product_id uuid,
  _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT business_id INTO _business_id FROM public.products WHERE id = _product_id;
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  UPDATE public.products
     SET direct_sale_enabled = false,
         updated_at = now()
   WHERE id = _product_id;

  INSERT INTO public.product_direct_sale_requests
    (product_id, business_id, status, requested_by, requested_at, decided_by, decided_at, decision_note)
  VALUES (_product_id, _business_id, 'revoked', auth.uid(), now(), auth.uid(), now(),
          NULLIF(btrim(COALESCE(_note,'')), ''));

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES ('product', _product_id, 'direct_sale_revoked', auth.uid(), jsonb_build_object('note', _note));
END;
$$;

REVOKE ALL ON FUNCTION public.product_direct_sale_request_submit(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.product_direct_sale_request_cancel(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.product_direct_sale_request_decide(uuid, boolean, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.product_direct_sale_revoke(uuid, text) FROM anon;