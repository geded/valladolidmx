CREATE OR REPLACE FUNCTION public._concierge_orders_fill_traveler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_p record;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NULLIF(BTRIM(COALESCE(NEW.traveler_name, '')), '') IS NOT NULL
     AND NULLIF(BTRIM(COALESCE(NEW.traveler_email, '')), '') IS NOT NULL
     AND NULLIF(BTRIM(COALESCE(NEW.traveler_phone, '')), '') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name, first_name, last_name, email, phone
    INTO v_p
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF NOT FOUND THEN RETURN NEW; END IF;

  NEW.traveler_name := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.traveler_name, '')), ''),
    NULLIF(BTRIM(COALESCE(v_p.display_name, '')), ''),
    NULLIF(BTRIM(CONCAT_WS(' ', v_p.first_name, v_p.last_name)), '')
  );
  NEW.traveler_email := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.traveler_email, '')), ''),
    NULLIF(BTRIM(COALESCE(v_p.email, '')), '')
  );
  NEW.traveler_phone := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.traveler_phone, '')), ''),
    NULLIF(BTRIM(COALESCE(v_p.phone, '')), '')
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._concierge_orders_fill_traveler() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS concierge_orders_fill_traveler ON public.concierge_orders;
CREATE TRIGGER concierge_orders_fill_traveler
BEFORE INSERT ON public.concierge_orders
FOR EACH ROW EXECUTE FUNCTION public._concierge_orders_fill_traveler();

UPDATE public.concierge_orders o
SET traveler_name  = COALESCE(NULLIF(BTRIM(COALESCE(o.traveler_name, '')), ''),
                              NULLIF(BTRIM(COALESCE(p.display_name, '')), ''),
                              NULLIF(BTRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')),
    traveler_email = COALESCE(NULLIF(BTRIM(COALESCE(o.traveler_email, '')), ''),
                              NULLIF(BTRIM(COALESCE(p.email, '')), '')),
    traveler_phone = COALESCE(NULLIF(BTRIM(COALESCE(o.traveler_phone, '')), ''),
                              NULLIF(BTRIM(COALESCE(p.phone, '')), ''))
FROM public.profiles p
WHERE p.user_id = o.user_id
  AND (NULLIF(BTRIM(COALESCE(o.traveler_name, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(o.traveler_email, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(o.traveler_phone, '')), '') IS NULL);