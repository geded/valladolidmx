CREATE OR REPLACE FUNCTION public._guard_orders_client_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  NEW.payment_status := 'unpaid';
  NEW.paid_at := NULL;
  NEW.payment_intent_id := NULL;
  NEW.payment_provider := NULL;
  NEW.confirmed_at := NULL;
  NEW.cancelled_at := NULL;
  NEW.subtotal_amount := 0;
  NEW.total_amount := 0;
  IF NEW.status NOT IN ('cart','pending') THEN NEW.status := 'cart'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_orders_client_insert BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public._guard_orders_client_insert();