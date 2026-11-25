
CREATE TABLE public.restaurant_booking_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  slot_minutes int NOT NULL DEFAULT 30,
  duration_minutes int NOT NULL DEFAULT 90,
  max_party int NOT NULL DEFAULT 8,
  min_notice_minutes int NOT NULL DEFAULT 60,
  max_days_ahead int NOT NULL DEFAULT 60,
  confirm_mode text NOT NULL DEFAULT 'inmediata',
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  billing_enabled boolean NOT NULL DEFAULT false,
  billing_mode text NOT NULL DEFAULT 'gratis',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_booking_settings TO authenticated;
GRANT ALL ON public.restaurant_booking_settings TO service_role;
ALTER TABLE public.restaurant_booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbs team and admin read" ON public.restaurant_booking_settings FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer') OR public.is_editor_or_admin(auth.uid()));

CREATE TABLE public.restaurant_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  folio text NOT NULL UNIQUE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  party_size int NOT NULL,
  status text NOT NULL DEFAULT 'confirmada',
  guest_name text NOT NULL,
  guest_phone text,
  guest_email text,
  occasion text,
  note text,
  source text NOT NULL DEFAULT 'pagina',
  user_id uuid,
  created_by uuid,
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_reservations_day_idx ON public.restaurant_reservations (business_id, starts_at);
CREATE INDEX restaurant_reservations_user_idx ON public.restaurant_reservations (user_id) WHERE user_id IS NOT NULL;
GRANT SELECT ON public.restaurant_reservations TO authenticated;
GRANT ALL ON public.restaurant_reservations TO service_role;
ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr team admin own read" ON public.restaurant_reservations FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'viewer')
         OR public.is_editor_or_admin(auth.uid())
         OR user_id = auth.uid());

-- Admin: acepta el nuevo modo «mesas».
CREATE OR REPLACE FUNCTION public.admin_set_business_online_sales(_business_id uuid, _enabled boolean, _modes text[], _channels text[], _note text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'business_not_found';
  END IF;
  IF NOT (COALESCE(_modes, '{}') <@ ARRAY['tienda','pedidos','reservas','salidas','mesas']::text[]) THEN
    RAISE EXCEPTION 'invalid_online_sales_mode';
  END IF;
  IF NOT (COALESCE(_channels, '{}') <@ ARRAY['pagina','alux_pagina','whatsapp']::text[]) THEN
    RAISE EXCEPTION 'invalid_online_sales_channel';
  END IF;
  IF _enabled AND (cardinality(COALESCE(_modes, '{}')) = 0 OR cardinality(COALESCE(_channels, '{}')) = 0) THEN
    RAISE EXCEPTION 'online_sales_needs_mode_and_channel';
  END IF;
  INSERT INTO public.business_online_sales AS s (business_id, enabled, modes, channels, note, updated_by)
  VALUES (_business_id, _enabled, COALESCE(_modes, '{}'), COALESCE(_channels, '{}'),
          NULLIF(btrim(COALESCE(_note, '')), ''), auth.uid())
  ON CONFLICT (business_id) DO UPDATE
    SET enabled = EXCLUDED.enabled, modes = EXCLUDED.modes, channels = EXCLUDED.channels,
        note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = now();
  INSERT INTO public.content_audit_log (entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('business', _business_id,
          CASE WHEN _enabled THEN 'online_sales_enabled' ELSE 'online_sales_disabled' END,
          auth.uid(), jsonb_build_object('modes', COALESCE(_modes, '{}'), 'channels', COALESCE(_channels, '{}')));
END;
$function$;

CREATE OR REPLACE FUNCTION public._restaurant_booking_on(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_online_sales s
      JOIN public.businesses b ON b.id = s.business_id
     WHERE s.business_id = _business_id AND s.enabled AND 'mesas' = ANY (s.modes)
       AND b.status = 'published')
  AND EXISTS (SELECT 1 FROM public.restaurant_booking_settings r WHERE r.business_id = _business_id
       AND jsonb_array_length(r.tables) > 0);
$$;

-- ¿Cabe un grupo a esa hora? Reparte mesas a las reservaciones que se cruzan (mayor grupo primero).
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
    SELECT r.party_size FROM public.restaurant_reservations r
     WHERE r.business_id = _business_id
       AND r.status IN ('pendiente','confirmada','llego','sentada')
       AND (_exclude IS NULL OR r.id <> _exclude)
       AND r.starts_at < v_end AND r.ends_at > _start
     ORDER BY r.party_size DESC
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
    (SELECT jsonb_build_object('enabled', true, 'max_party', r.max_party, 'max_days_ahead', r.max_days_ahead,
       'confirm_mode', r.confirm_mode, 'duration_minutes', r.duration_minutes)
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
  IF _party IS NULL OR _party < 1 OR _party > s.max_party THEN RETURN; END IF;
  IF _date < v_today OR _date > v_today + s.max_days_ahead THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.commerce_blackouts b WHERE b.business_id = _business_id AND b.product_id IS NULL
       AND b.starts_at < ((_date + 1)::timestamp AT TIME ZONE 'America/Merida')
       AND b.ends_at > (_date::timestamp AT TIME ZONE 'America/Merida')) THEN RETURN; END IF;
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
      EXIT WHEN t < t_open; -- cruzó medianoche
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._restaurant_notify(_r public.restaurant_reservations, _event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_rec record; v_payload jsonb; v_id text;
BEGIN
  v_payload := jsonb_build_object('reservation_id', _r.id, 'folio', _r.folio, 'business_id', _r.business_id,
    'starts_at', _r.starts_at, 'party_size', _r.party_size, 'status', _r.status);
  FOR v_rec IN SELECT DISTINCT bu.user_id FROM public.business_users bu
     WHERE bu.business_id = _r.business_id AND bu.status = 'active' AND bu.role IN ('owner','manager','editor')
  LOOP
    v_id := _event || ':' || _r.id::text || ':' || _r.status || ':' || v_rec.user_id::text;
    PERFORM public.unc_publish_in_app(v_id, _event, v_rec.user_id, 'business', 'transactional', v_payload);
    INSERT INTO public.notification_deliveries (event_id, event_type, category, channel, recipient_user_id, audience, status, payload_ref)
    VALUES (v_id, _event, 'transactional', 'push', v_rec.user_id, 'business', 'pending', v_payload)
    ON CONFLICT (event_id, channel, recipient_user_id) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_book(_business_id uuid, _starts_at timestamptz, _party int,
  _name text, _phone text, _email text DEFAULT NULL, _occasion text DEFAULT NULL, _note text DEFAULT NULL, _source text DEFAULT 'pagina')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  s public.restaurant_booking_settings;
  v_phone text := regexp_replace(COALESCE(_phone, ''), '[^0-9+]', '', 'g');
  v_local date; v_ok boolean; r public.restaurant_reservations;
BEGIN
  IF NOT public._restaurant_booking_on(_business_id) THEN RAISE EXCEPTION 'booking_off'; END IF;
  IF _source NOT IN ('pagina','alux','whatsapp') THEN RAISE EXCEPTION 'invalid_source'; END IF;
  IF length(btrim(COALESCE(_name, ''))) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF length(regexp_replace(v_phone, '\D', '', 'g')) < 10 OR length(v_phone) > 16 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF _email IS NOT NULL AND btrim(_email) <> '' AND _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'invalid_email'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  v_local := (_starts_at AT TIME ZONE 'America/Merida')::date;
  SELECT EXISTS (SELECT 1 FROM public.restaurant_public_slots(_business_id, v_local, _party) x
                  WHERE x.starts_at = _starts_at AND x.available) INTO v_ok;
  PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:' || _business_id::text));
  IF NOT v_ok OR NOT public._restaurant_fits(_business_id, _starts_at, _party) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
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
  RETURN jsonb_build_object('id', r.id, 'folio', r.folio, 'status', r.status, 'starts_at', r.starts_at, 'party_size', r.party_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_staff_create(_business_id uuid, _starts_at timestamptz, _party int,
  _name text, _phone text DEFAULT NULL, _note text DEFAULT NULL, _source text DEFAULT 'telefono')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.restaurant_booking_settings; v_id uuid;
BEGIN
  IF NOT (public.has_business_access(auth.uid(), _business_id, 'editor') OR public.is_editor_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _source NOT IN ('telefono','sin_cita') THEN RAISE EXCEPTION 'invalid_source'; END IF;
  IF _party IS NULL OR _party < 1 OR _party > 60 THEN RAISE EXCEPTION 'invalid_party'; END IF;
  IF length(btrim(COALESCE(_name, ''))) < 1 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = _business_id;
  INSERT INTO public.restaurant_reservations (business_id, folio, starts_at, ends_at, party_size, status,
     guest_name, guest_phone, note, source, created_by)
  VALUES (_business_id, 'MESA-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), _starts_at,
     _starts_at + make_interval(mins => COALESCE(s.duration_minutes, 90)), _party,
     CASE WHEN _source = 'sin_cita' THEN 'sentada' ELSE 'confirmada' END,
     left(btrim(_name), 120), NULLIF(regexp_replace(COALESCE(_phone, ''), '[^0-9+]', '', 'g'), ''),
     left(NULLIF(btrim(COALESCE(_note, '')), ''), 500), _source, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_reservation_update(_id uuid, _status text DEFAULT NULL,
  _starts_at timestamptz DEFAULT NULL, _party int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.restaurant_reservations; v_staff boolean; s public.restaurant_booking_settings;
BEGIN
  SELECT * INTO r FROM public.restaurant_reservations WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  v_staff := public.has_business_access(auth.uid(), r.business_id, 'editor') OR public.is_editor_or_admin(auth.uid());
  IF NOT v_staff THEN
    IF r.user_id IS DISTINCT FROM auth.uid() OR _status IS DISTINCT FROM 'cancelada' OR _starts_at IS NOT NULL OR _party IS NOT NULL
       OR r.status NOT IN ('pendiente','confirmada') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('pendiente','confirmada','llego','sentada','terminada','no_vino','cancelada','rechazada') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id = r.business_id;
  UPDATE public.restaurant_reservations SET
    status = COALESCE(_status, status),
    status_changed_at = CASE WHEN _status IS NOT NULL AND _status <> r.status THEN now() ELSE status_changed_at END,
    starts_at = COALESCE(_starts_at, starts_at),
    ends_at = COALESCE(_starts_at, starts_at) + make_interval(mins => COALESCE(s.duration_minutes, 90)),
    party_size = COALESCE(_party, party_size),
    updated_at = now()
  WHERE id = _id RETURNING * INTO r;
  IF _status IN ('confirmada','rechazada','cancelada') THEN
    PERFORM public._restaurant_notify(r, 'Restaurant.Booking.Updated');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_booking_settings_save(_business_id uuid, _settings jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE t jsonb; k text;
BEGIN
  IF NOT (public.has_business_access(auth.uid(), _business_id, 'manager') OR public.is_editor_or_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF jsonb_typeof(COALESCE(_settings->'tables', '[]')) <> 'array' OR jsonb_array_length(_settings->'tables') > 30 THEN RAISE EXCEPTION 'invalid_tables'; END IF;
  FOR t IN SELECT * FROM jsonb_array_elements(_settings->'tables') LOOP
    IF COALESCE((t->>'seats')::int, 0) NOT BETWEEN 1 AND 30 OR COALESCE((t->>'count')::int, 0) NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION 'invalid_tables';
    END IF;
  END LOOP;
  IF jsonb_typeof(COALESCE(_settings->'hours', '{}')) <> 'object' THEN RAISE EXCEPTION 'invalid_hours'; END IF;
  FOR k IN SELECT jsonb_object_keys(_settings->'hours') LOOP
    IF k NOT IN ('1','2','3','4','5','6','7') THEN RAISE EXCEPTION 'invalid_hours'; END IF;
  END LOOP;
  IF COALESCE(_settings->>'confirm_mode', 'inmediata') NOT IN ('inmediata','confirmacion') THEN RAISE EXCEPTION 'invalid_confirm_mode'; END IF;
  INSERT INTO public.restaurant_booking_settings AS r (business_id, slot_minutes, duration_minutes, max_party,
     min_notice_minutes, max_days_ahead, confirm_mode, hours, tables, updated_by)
  VALUES (_business_id,
     LEAST(GREATEST(COALESCE((_settings->>'slot_minutes')::int, 30), 15), 120),
     LEAST(GREATEST(COALESCE((_settings->>'duration_minutes')::int, 90), 30), 360),
     LEAST(GREATEST(COALESCE((_settings->>'max_party')::int, 8), 1), 60),
     LEAST(GREATEST(COALESCE((_settings->>'min_notice_minutes')::int, 60), 0), 4320),
     LEAST(GREATEST(COALESCE((_settings->>'max_days_ahead')::int, 60), 1), 365),
     COALESCE(_settings->>'confirm_mode', 'inmediata'),
     COALESCE(_settings->'hours', '{}'), COALESCE(_settings->'tables', '[]'), auth.uid())
  ON CONFLICT (business_id) DO UPDATE SET
     slot_minutes = EXCLUDED.slot_minutes, duration_minutes = EXCLUDED.duration_minutes,
     max_party = EXCLUDED.max_party, min_notice_minutes = EXCLUDED.min_notice_minutes,
     max_days_ahead = EXCLUDED.max_days_ahead, confirm_mode = EXCLUDED.confirm_mode,
     hours = EXCLUDED.hours, tables = EXCLUDED.tables, updated_by = EXCLUDED.updated_by, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_restaurant_booking_billing(_business_id uuid, _enabled boolean, _mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _mode NOT IN ('gratis','por_persona','mensualidad') THEN RAISE EXCEPTION 'invalid_billing_mode'; END IF;
  INSERT INTO public.restaurant_booking_settings AS r (business_id, billing_enabled, billing_mode, updated_by)
  VALUES (_business_id, _enabled, _mode, auth.uid())
  ON CONFLICT (business_id) DO UPDATE SET billing_enabled = EXCLUDED.billing_enabled,
     billing_mode = EXCLUDED.billing_mode, updated_by = EXCLUDED.updated_by, updated_at = now();
  INSERT INTO public.content_audit_log (entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES ('business', _business_id, 'table_booking_billing_set', auth.uid(), jsonb_build_object('enabled', _enabled, 'mode', _mode));
END;
$$;

REVOKE EXECUTE ON FUNCTION public._restaurant_fits(uuid, timestamptz, int, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._restaurant_notify(public.restaurant_reservations, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._restaurant_booking_on(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restaurant_staff_create(uuid, timestamptz, int, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_reservation_update(uuid, text, timestamptz, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_booking_settings_save(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_restaurant_booking_billing(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restaurant_public_booking_config(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_public_slots(uuid, date, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_book(uuid, timestamptz, int, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_staff_create(uuid, timestamptz, int, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_reservation_update(uuid, text, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurant_booking_settings_save(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_restaurant_booking_billing(uuid, boolean, text) TO authenticated;
