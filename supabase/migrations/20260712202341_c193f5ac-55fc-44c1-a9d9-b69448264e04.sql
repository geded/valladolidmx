
CREATE OR REPLACE FUNCTION public.update_product_direct_sale_settings(
  _product_id uuid,
  _enabled boolean,
  _price_amount integer DEFAULT NULL,
  _currency text DEFAULT NULL,
  _commission_bps integer DEFAULT NULL,
  _cancellation_policy text DEFAULT NULL,
  _terms text DEFAULT NULL,
  _min_lead_hours integer DEFAULT NULL,
  _max_quantity integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
BEGIN
  SELECT business_id INTO _business_id FROM public.products WHERE id = _product_id AND deleted_at IS NULL;
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF NOT public.has_business_access(auth.uid(), _business_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden_business_access';
  END IF;

  IF _enabled THEN
    IF _price_amount IS NULL OR _price_amount <= 0 THEN
      RAISE EXCEPTION 'direct_sale_price_required';
    END IF;
    IF _commission_bps IS NOT NULL AND (_commission_bps < 0 OR _commission_bps > 10000) THEN
      RAISE EXCEPTION 'invalid_commission_bps';
    END IF;
    IF _min_lead_hours IS NOT NULL AND _min_lead_hours < 0 THEN
      RAISE EXCEPTION 'invalid_min_lead_hours';
    END IF;
    IF _max_quantity IS NOT NULL AND _max_quantity <= 0 THEN
      RAISE EXCEPTION 'invalid_max_quantity';
    END IF;
  END IF;

  UPDATE public.products
  SET
    direct_sale_enabled = _enabled,
    direct_sale_price_amount = COALESCE(_price_amount, direct_sale_price_amount),
    direct_sale_currency = COALESCE(_currency, direct_sale_currency, 'MXN'),
    direct_sale_commission_bps = COALESCE(_commission_bps, direct_sale_commission_bps),
    direct_sale_cancellation_policy = COALESCE(_cancellation_policy, direct_sale_cancellation_policy),
    direct_sale_terms = COALESCE(_terms, direct_sale_terms),
    direct_sale_min_lead_hours = COALESCE(_min_lead_hours, direct_sale_min_lead_hours),
    direct_sale_max_quantity = COALESCE(_max_quantity, direct_sale_max_quantity),
    updated_at = now()
  WHERE id = _product_id;

  INSERT INTO public.content_audit_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    'product',
    _product_id,
    CASE WHEN _enabled THEN 'direct_sale_enabled' ELSE 'direct_sale_disabled' END,
    auth.uid(),
    jsonb_build_object(
      'price_amount', _price_amount,
      'currency', _currency,
      'commission_bps', _commission_bps
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_product_direct_sale_settings(uuid, boolean, integer, text, integer, text, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.update_product_direct_sale_settings(uuid, boolean, integer, text, integer, text, text, integer, integer) TO authenticated;
