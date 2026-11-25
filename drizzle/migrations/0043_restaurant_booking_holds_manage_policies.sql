ALTER TABLE public.restaurant_booking_settings
  ADD COLUMN IF NOT EXISTS min_party int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS policies text;
ALTER TABLE public.restaurant_reservations
  ADD COLUMN IF NOT EXISTS manage_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_reservations_manage_token_idx ON public.restaurant_reservations (manage_token);

CREATE TABLE IF NOT EXISTS public.restaurant_slot_holds (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  party_size int NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS restaurant_slot_holds_biz_idx ON public.restaurant_slot_holds (business_id, starts_at);
GRANT ALL ON public.restaurant_slot_holds TO service_role;
ALTER TABLE public.restaurant_slot_holds ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._restaurant_fits(_business_id uuid, _start timestamptz, _party int, _exclude uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.restaurant_booking_settings;
  free int[] := '{}';
  t jsonb; i int; p int; best int; idx int;
  v_end timestamptz;
BEGIN
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  IF NOT FOUND THEN RETURN false; END IF;
  v_end := _start + make_interval(mins => s.duration_minutes);
  FOR t IN SELECT * FROM jsonb_array_elements(s.tables) LOOP
    FOR i IN 1..LEAST(GREATEST(COALESCE((t->>'count')::int, 0), 0), 200) LOOP
      free := free || COALESCE((t->>'seats')::int, 0);
    END LOOP;
  END LOOP;
  FOR p IN
    SELECT x.party_size FROM (
      SELECT r.party_size FROM public.restaurant_reservations r
       WHERE r.business_id = _business_id
         AND r.status IN ('pendiente','confirmada','llego','sentada')
         AND (_exclude IS NULL OR r.id <> _exclude)
         AND r.starts_at < v_end AND r.ends_at > _start
      UNION ALL
      SELECT h.party_size FROM public.restaurant_slot_holds h
       WHERE h.business_id = _business_id AND h.expires_at > now()
         AND (_exclude IS NULL OR h.token <> _exclude)
         AND h.starts_at < v_end AND h.ends_at > _start
    ) x ORDER BY x.party_size DESC
  LOOP
    best := NULL; idx := NULL;
    FOR i IN 1..COALESCE(array_length(free, 1), 0) LOOP
      IF free[i] >= p AND (best IS NULL OR free[i] < best) THEN best := free[i]; idx := i; END IF;
    END LOOP;
    IF idx IS NOT NULL THEN free := free[1:idx-1] || free[idx+1:]; END IF;
  END LOOP;
  FOR i IN 1..COALESCE(array_length(free, 1), 0) LOOP
    IF free[i] >= _party THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_public_booking_config(_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public._restaurant_booking_on(_business_id) THEN
    (SELECT jsonb_build_object('enabled', true, 'max_party', r.max_party, 'min_party', r.min_party,
       'max_days_ahead', r.max_days_ahead, 'confirm_mode', r.confirm_mode, 'duration_minutes', r.duration_minutes,
       'min_notice_minutes', r.min_notice_minutes, 'policies', r.policies)
       FROM public.restaurant_booking_settings r WHERE r.business_id = _business_id)
  ELSE jsonb_build_object('enabled', false) END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_public_slots(_business_id uuid, _date date, _party int)
RETURNS TABLE(slot_time text, starts_at timestamptz, available boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.restaurant_booking_settings;
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  rng jsonb; t_open time; t_close time; t time; v_start timestamptz;
BEGIN
  IF NOT public._restaurant_booking_on(_business_id) THEN RETURN; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  IF _party IS NULL OR _party < GREATEST(s.min_party, 1) OR _party > s.max_party THEN RETURN; END IF;
  IF _date < v_today OR _date > v_today + s.max_days_ahead THEN RETURN; END IF;
  IF public.restaurant_day_closed(_business_id, _date) THEN RETURN; END IF;
  FOR rng IN SELECT * FROM jsonb_array_elements(COALESCE(s.hours -> extract(isodow FROM _date)::int::text, '[]'::jsonb)) LOOP
    BEGIN
      t_open := (rng->>0)::time; t_close := (rng->>1)::time;
    EXCEPTION WHEN others THEN CONTINUE; END;
    t := t_open;
    WHILE t + make_interval(mins => s.duration_minutes) <= t_close AND t >= t_open LOOP
      v_start := (_date + t)::timestamp AT TIME ZONE 'America/Merida';
      slot_time := to_char(t, 'HH24:MI');
      starts_at := v_start;
      available := v_start >= now() + make_interval(mins => s.min_notice_minutes)
                   AND public._restaurant_fits(_business_id, v_start, _party);
      RETURN NEXT;
      t := t + make_interval(mins => s.slot_minutes);
      EXIT WHEN t < t_open;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_no_availability_reason(_business_id uuid, _date date, _party int)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.restaurant_booking_settings; v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_any boolean; v_future boolean; v_free boolean;
BEGIN
  IF NOT public._restaurant_booking_on(_business_id) THEN RETURN 'off'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  IF _party > s.max_party THEN RETURN 'above_max_party'; END IF;
  IF _party < s.min_party THEN RETURN 'below_min_party'; END IF;
  IF _date > v_today + s.max_days_ahead THEN RETURN 'too_far_ahead'; END IF;
  IF _date < v_today THEN RETURN 'past'; END IF;
  IF public.restaurant_day_closed(_business_id, _date) THEN RETURN 'closed_day'; END IF;
  SELECT count(*) > 0,
         bool_or(x.starts_at >= now() + make_interval(mins => s.min_notice_minutes)),
         bool_or(x.available)
    INTO v_any, v_future, v_free FROM public.restaurant_public_slots(_business_id, _date, _party) x;
  IF NOT v_any THEN RETURN 'no_hours'; END IF;
  IF v_free THEN RETURN NULL; END IF;
  IF NOT COALESCE(v_future, false) THEN RETURN 'same_day_cutoff'; END IF;
  RETURN 'fully_booked';
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_hold_slot(_business_id uuid, _starts_at timestamptz, _party int, _replace uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.restaurant_booking_settings; v_ok boolean; h public.restaurant_slot_holds;
BEGIN
  IF NOT public._restaurant_booking_on(_business_id) THEN RAISE EXCEPTION 'booking_off'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:' || _business_id::text));
  DELETE FROM public.restaurant_slot_holds WHERE expires_at < now() - interval '1 hour';
  IF _replace IS NOT NULL THEN DELETE FROM public.restaurant_slot_holds WHERE token = _replace; END IF;
  IF (SELECT count(*) FROM public.restaurant_slot_holds WHERE business_id = _business_id AND expires_at > now()) >= 40 THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  SELECT EXISTS (SELECT 1 FROM public.restaurant_public_slots(_business_id, (_starts_at AT TIME ZONE 'America/Merida')::date, _party) x
                  WHERE x.starts_at = _starts_at AND x.available) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  INSERT INTO public.restaurant_slot_holds (business_id, starts_at, ends_at, party_size, expires_at)
  VALUES (_business_id, _starts_at, _starts_at + make_interval(mins => s.duration_minutes), _party, now() + interval '5 minutes')
  RETURNING * INTO h;
  RETURN jsonb_build_object('token', h.token, 'expires_at', h.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_release_hold(_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$ DELETE FROM public.restaurant_slot_holds WHERE token = _token; $$;

DROP FUNCTION IF EXISTS public.restaurant_book(uuid, timestamptz, int, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.restaurant_book(_business_id uuid, _starts_at timestamptz, _party int,
  _name text, _phone text, _email text DEFAULT NULL, _occasion text DEFAULT NULL, _note text DEFAULT NULL, _source text DEFAULT 'pagina',
  _hold uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.restaurant_booking_settings;
  v_phone text := regexp_replace(COALESCE(_phone, ''), '[^0-9+]', '', 'g');
  r public.restaurant_reservations;
BEGIN
  IF NOT public._restaurant_booking_on(_business_id) THEN RAISE EXCEPTION 'booking_off'; END IF;
  IF _source NOT IN ('pagina','alux','whatsapp') THEN RAISE EXCEPTION 'invalid_source'; END IF;
  IF length(btrim(COALESCE(_name, ''))) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(regexp_replace(v_phone, '\D', '', 'g')) < 10 OR length(v_phone) > 16 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF _email IS NOT NULL AND btrim(_email) <> '' AND _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  IF _party < s.min_party OR _party > s.max_party THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:' || _business_id::text));
  IF _hold IS NOT NULL THEN
    DELETE FROM public.restaurant_slot_holds WHERE token = _hold AND business_id = _business_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurant_public_slots(_business_id, (_starts_at AT TIME ZONE 'America/Merida')::date, _party) x
                  WHERE x.starts_at = _starts_at AND x.available) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;
  IF (SELECT count(*) FROM public.restaurant_reservations x WHERE x.business_id = _business_id
        AND x.guest_phone = v_phone AND x.starts_at > now() AND x.status IN ('pendiente','confirmada')) >= 3 THEN
    RAISE EXCEPTION 'too_many_reservations';
  END IF;
  INSERT INTO public.restaurant_reservations (business_id, folio, starts_at, ends_at, party_size, status,
     guest_name, guest_phone, guest_email, occasion, note, source, user_id, created_by)
  VALUES (_business_id, 'MESA-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), _starts_at,
     _starts_at + make_interval(mins => s.duration_minutes), _party,
     CASE WHEN s.confirm_mode = 'confirmacion' THEN 'pendiente' ELSE 'confirmada' END,
     btrim(_name), v_phone, NULLIF(btrim(COALESCE(_email, '')), ''), left(NULLIF(btrim(COALESCE(_occasion, '')), ''), 60),
     left(NULLIF(btrim(COALESCE(_note, '')), ''), 500), _source, auth.uid(), auth.uid())
  RETURNING * INTO r;
  PERFORM public._restaurant_notify(r, 'Restaurant.Booking.Created');
  RETURN jsonb_build_object('id', r.id, 'folio', r.folio, 'status', r.status, 'starts_at', r.starts_at,
    'party_size', r.party_size, 'manage_token', r.manage_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_manage_get(_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('folio', r.folio, 'status', r.status, 'starts_at', r.starts_at, 'party_size', r.party_size,
     'guest_name', r.guest_name, 'business_id', r.business_id, 'business_name', b.display_name,
     'policies', s.policies, 'max_party', s.max_party, 'min_party', s.min_party, 'max_days_ahead', s.max_days_ahead,
     'can_change', r.status IN ('pendiente','confirmada') AND r.starts_at > now())
    FROM public.restaurant_reservations r
    JOIN public.businesses b ON b.id = r.business_id
    LEFT JOIN public.restaurant_booking_settings s ON s.business_id = r.business_id
   WHERE r.manage_token = _token;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_manage_cancel(_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.restaurant_reservations;
BEGIN
  SELECT * INTO r FROM public.restaurant_reservations WHERE manage_token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status NOT IN ('pendiente','confirmada') OR r.starts_at <= now() THEN RAISE EXCEPTION 'cannot_change'; END IF;
  UPDATE public.restaurant_reservations SET status = 'cancelada', status_changed_at = now(), updated_at = now()
   WHERE id = r.id RETURNING * INTO r;
  PERFORM public._restaurant_notify(r, 'Restaurant.Booking.Updated');
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_manage_modify(_token uuid, _starts_at timestamptz, _party int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.restaurant_reservations; s public.restaurant_booking_settings; v_ok boolean;
BEGIN
  SELECT * INTO r FROM public.restaurant_reservations WHERE manage_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status NOT IN ('pendiente','confirmada') OR r.starts_at <= now() THEN RAISE EXCEPTION 'cannot_change'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:' || r.business_id::text));
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = r.business_id;
  IF _party < s.min_party OR _party > s.max_party THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  IF _starts_at < now() + make_interval(mins => s.min_notice_minutes) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.restaurant_public_slots(r.business_id, (_starts_at AT TIME ZONE 'America/Merida')::date, GREATEST(s.min_party, 1)) x
                  WHERE x.starts_at = _starts_at) INTO v_ok;
  IF NOT v_ok OR NOT public._restaurant_fits(r.business_id, _starts_at, _party, r.id) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  UPDATE public.restaurant_reservations SET starts_at = _starts_at,
     ends_at = _starts_at + make_interval(mins => s.duration_minutes), party_size = _party,
     status = CASE WHEN s.confirm_mode = 'confirmacion' THEN 'pendiente' ELSE status END,
     table_id = NULL, status_changed_at = now(), updated_at = now()
   WHERE id = r.id RETURNING * INTO r;
  PERFORM public._restaurant_notify(r, 'Restaurant.Booking.Updated');
  RETURN jsonb_build_object('status', r.status, 'starts_at', r.starts_at, 'party_size', r.party_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_booking_policies_save(_business_id uuid, _min_party int, _policies text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_business_access(auth.uid(), _business_id, 'manager') OR public.is_editor_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.restaurant_booking_settings SET
     min_party = LEAST(GREATEST(COALESCE(_min_party, 1), 1), max_party),
     policies = left(NULLIF(btrim(COALESCE(_policies, '')), ''), 1500),
     updated_by = auth.uid(), updated_at = now()
   WHERE business_id = _business_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restaurant_hold_slot(uuid, timestamptz, int, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restaurant_release_hold(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restaurant_manage_get(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restaurant_manage_cancel(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restaurant_manage_modify(uuid, timestamptz, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restaurant_booking_policies_save(uuid, int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_book(uuid, timestamptz, int, text, text, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_book(uuid, timestamptz, int, text, text, text, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_no_availability_reason(uuid, date, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_hold_slot(uuid, timestamptz, int, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_release_hold(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_manage_get(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_manage_cancel(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_manage_modify(uuid, timestamptz, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_booking_policies_save(uuid, int, text) TO authenticated;