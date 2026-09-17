
CREATE OR REPLACE FUNCTION public._commerce_notify_booking(_order public.concierge_orders, _event text, _category public.notification_category)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id text;
  v_rec RECORD;
  v_any boolean := false;
  v_payload jsonb;
BEGIN
  v_event_id := _event || ':' || _order.id::text;
  v_payload := jsonb_build_object(
    'order_id', _order.id,
    'folio', _order.folio,
    'source_kind', _order.source_kind,
    'total_amount', _order.total_amount,
    'currency', _order.currency
  );

  -- Concierge asignado al expediente, si existe.
  IF _order.source_case_id IS NOT NULL THEN
    FOR v_rec IN
      SELECT DISTINCT ca.concierge_user_id AS user_id
        FROM public.concierge_assignments ca
       WHERE ca.case_id = _order.source_case_id
         AND ca.released_at IS NULL
         AND ca.concierge_user_id IS NOT NULL
    LOOP
      v_any := true;
      PERFORM public.unc_publish_in_app(
        v_event_id || ':staff:' || v_rec.user_id::text,
        _event, v_rec.user_id, 'concierge', _category, v_payload);
    END LOOP;
  END IF;

  IF NOT v_any THEN
    FOR v_rec IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur
       WHERE ur.role IN ('concierge_lead', 'concierge')
    LOOP
      PERFORM public.unc_publish_in_app(
        v_event_id || ':ops:' || v_rec.user_id::text,
        _event, v_rec.user_id, 'concierge', _category, v_payload);
    END LOOP;
  END IF;

  -- Anfitriones (empresas) de las partidas reservadas.
  FOR v_rec IN
    SELECT DISTINCT bu.user_id
      FROM public.concierge_order_items oi
      JOIN public.business_users bu ON bu.business_id = oi.business_id
     WHERE oi.order_id = _order.id
       AND oi.business_id IS NOT NULL
       AND bu.status = 'active'
       AND bu.role IN ('owner', 'manager')
  LOOP
    PERFORM public.unc_publish_in_app(
      v_event_id || ':host:' || v_rec.user_id::text,
      _event, v_rec.user_id, 'business', _category, v_payload);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._commerce_notify_booking(public.concierge_orders, text, public.notification_category) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._commerce_orders_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.source_kind = 'direct_sale' THEN
      PERFORM public._commerce_notify_booking(NEW, 'Concierge.Booking.Created', 'operational'::public.notification_category);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL THEN
    PERFORM public._commerce_notify_booking(NEW, 'Concierge.Booking.Paid', 'transactional'::public.notification_category);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._commerce_orders_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_commerce_orders_notify_ins ON public.concierge_orders;
CREATE TRIGGER trg_commerce_orders_notify_ins
AFTER INSERT ON public.concierge_orders
FOR EACH ROW EXECUTE FUNCTION public._commerce_orders_notify();

DROP TRIGGER IF EXISTS trg_commerce_orders_notify_upd ON public.concierge_orders;
CREATE TRIGGER trg_commerce_orders_notify_upd
AFTER UPDATE OF paid_at ON public.concierge_orders
FOR EACH ROW EXECUTE FUNCTION public._commerce_orders_notify();
