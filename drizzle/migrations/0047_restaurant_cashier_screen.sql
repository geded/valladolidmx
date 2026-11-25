ALTER TABLE public.restaurant_booking_settings
  ADD COLUMN IF NOT EXISTS cashier_pin_hash text,
  ADD COLUMN IF NOT EXISTS cashier_fail_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashier_locked_until timestamptz;

CREATE TABLE public.restaurant_cashier_sessions (
  token_hash text PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.restaurant_cashier_sessions TO service_role;
ALTER TABLE public.restaurant_cashier_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._cashier_hash(_business_id uuid, _secret text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT encode(sha256(convert_to(_business_id::text || ':' || _secret, 'UTF8')), 'hex'); $$;
REVOKE ALL ON FUNCTION public._cashier_hash(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._cashier_business(_token text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.business_id FROM public.restaurant_cashier_sessions s
   WHERE s.token_hash = encode(sha256(convert_to(COALESCE(_token, ''), 'UTF8')), 'hex') AND s.expires_at > now();
$$;
REVOKE ALL ON FUNCTION public._cashier_business(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.restaurant_cashier_set_pin(_business_id uuid, _pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_business_access(auth.uid(), _business_id, 'manager') OR public.is_editor_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _pin IS NOT NULL AND _pin !~ '^[0-9]{4,6}$' THEN RAISE EXCEPTION 'invalid_pin'; END IF;
  INSERT INTO public.restaurant_booking_settings (business_id, cashier_pin_hash, updated_by)
  VALUES (_business_id, CASE WHEN _pin IS NULL THEN NULL ELSE public._cashier_hash(_business_id, _pin) END, auth.uid())
  ON CONFLICT (business_id) DO UPDATE SET cashier_pin_hash = EXCLUDED.cashier_pin_hash,
    cashier_fail_count = 0, cashier_locked_until = NULL, updated_by = auth.uid(), updated_at = now();
  DELETE FROM public.restaurant_cashier_sessions WHERE business_id = _business_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.restaurant_cashier_set_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.restaurant_cashier_pin_status(_business_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.restaurant_booking_settings; b public.businesses;
BEGIN
  IF NOT public._restaurant_staff(_business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  SELECT * INTO b FROM public.businesses WHERE id = _business_id;
  RETURN jsonb_build_object('has_pin', s.cashier_pin_hash IS NOT NULL, 'slug', b.slug);
END; $$;
GRANT EXECUTE ON FUNCTION public.restaurant_cashier_pin_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restaurant_cashier_login(_slug text, _pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE b public.businesses; s public.restaurant_booking_settings; v_token text;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE slug = _slug AND deleted_at IS NULL LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'bad_pin'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = b.id FOR UPDATE;
  IF NOT FOUND OR s.cashier_pin_hash IS NULL THEN RAISE EXCEPTION 'no_pin'; END IF;
  IF s.cashier_locked_until IS NOT NULL AND s.cashier_locked_until > now() THEN RAISE EXCEPTION 'locked'; END IF;
  IF COALESCE(_pin, '') !~ '^[0-9]{4,6}$' OR public._cashier_hash(b.id, _pin) <> s.cashier_pin_hash THEN
    UPDATE public.restaurant_booking_settings SET cashier_fail_count = cashier_fail_count + 1,
      cashier_locked_until = CASE WHEN cashier_fail_count + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END
     WHERE business_id = b.id;
    RETURN jsonb_build_object('ok', false);
  END IF;
  UPDATE public.restaurant_booking_settings SET cashier_fail_count = 0, cashier_locked_until = NULL WHERE business_id = b.id;
  DELETE FROM public.restaurant_cashier_sessions WHERE expires_at < now();
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  INSERT INTO public.restaurant_cashier_sessions (token_hash, business_id, expires_at)
  VALUES (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), b.id, now() + interval '16 hours');
  RETURN jsonb_build_object('ok', true, 'token', v_token, 'name', b.name);
END; $$;
GRANT EXECUTE ON FUNCTION public.restaurant_cashier_login(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.restaurant_cashier_board(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_biz uuid; s public.restaurant_booking_settings; v_name text;
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Merida') AT TIME ZONE 'America/Merida';
BEGIN
  v_biz := public._cashier_business(_token);
  IF v_biz IS NULL THEN RAISE EXCEPTION 'session_expired'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = v_biz;
  SELECT name INTO v_name FROM public.businesses WHERE id = v_biz;
  RETURN jsonb_build_object(
    'name', v_name,
    'floor_plan', COALESCE(s.floor_plan, '[]'::jsonb),
    'tables', COALESCE(s.tables, '[]'::jsonb),
    'reservations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'table_id', r.table_id, 'party_size', r.party_size, 'status', r.status,
        'starts_at', r.starts_at, 'ends_at', r.ends_at, 'source', r.source,
        'guest', split_part(r.guest_name, ' ', 1)) ORDER BY r.starts_at)
      FROM public.restaurant_reservations r
      WHERE r.business_id = v_biz AND r.starts_at >= v_day_start AND r.starts_at < v_day_start + interval '1 day'
        AND r.status IN ('pendiente','confirmada','llego','sentada')), '[]'::jsonb));
END; $$;
GRANT EXECUTE ON FUNCTION public.restaurant_cashier_board(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.restaurant_cashier_seat(_token text, _table_id text, _party int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_biz uuid; s public.restaurant_booking_settings; v_id uuid; v_end timestamptz;
BEGIN
  v_biz := public._cashier_business(_token);
  IF v_biz IS NULL THEN RAISE EXCEPTION 'session_expired'; END IF;
  IF _party IS NULL OR _party < 1 OR _party > 60 THEN RAISE EXCEPTION 'invalid_party'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = v_biz;
  v_end := now() + make_interval(mins => COALESCE(s.duration_minutes, 90));
  IF _table_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.restaurant_reservations o
     WHERE o.business_id = v_biz AND o.table_id = _table_id AND o.status IN ('llego','sentada')
       AND o.starts_at <= now() AND o.ends_at > now()) THEN
    RAISE EXCEPTION 'table_taken';
  END IF;
  INSERT INTO public.restaurant_reservations (business_id, folio, starts_at, ends_at, party_size, status,
     guest_name, source, table_id)
  VALUES (v_biz, 'MESA-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), now(), v_end, _party, 'sentada',
     'Sin reservación', 'sin_cita', NULLIF(btrim(COALESCE(_table_id, '')), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.restaurant_cashier_seat(text, text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.restaurant_cashier_set(_token text, _reservation_id uuid, _action text, _table_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_biz uuid; r public.restaurant_reservations; s public.restaurant_booking_settings;
BEGIN
  v_biz := public._cashier_business(_token);
  IF v_biz IS NULL THEN RAISE EXCEPTION 'session_expired'; END IF;
  SELECT * INTO r FROM public.restaurant_reservations WHERE id = _reservation_id AND business_id = v_biz FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _action = 'sentar' THEN
    IF r.status NOT IN ('pendiente','confirmada','llego') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = v_biz;
    UPDATE public.restaurant_reservations SET status = 'sentada',
      table_id = COALESCE(NULLIF(btrim(COALESCE(_table_id, '')), ''), table_id),
      ends_at = GREATEST(ends_at, now() + make_interval(mins => COALESCE(s.duration_minutes, 90)) - (now() - LEAST(now(), starts_at))),
      status_changed_at = now(), updated_at = now() WHERE id = r.id;
  ELSIF _action = 'liberar' THEN
    IF r.status <> 'sentada' THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.restaurant_reservations SET status = 'terminada', ends_at = LEAST(ends_at, now()),
      status_changed_at = now(), updated_at = now() WHERE id = r.id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.restaurant_cashier_set(text, uuid, text, text) TO anon, authenticated;