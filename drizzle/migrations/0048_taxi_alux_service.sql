CREATE TABLE public.taxi_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL,
  email text NOT NULL,
  phone text,
  english boolean NOT NULL DEFAULT false,
  languages text[] NOT NULL DEFAULT ARRAY['es']::text[],
  license_number text,
  vehicle_description text NOT NULL,
  plates text NOT NULL,
  insurance_reference text,
  approved boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT false,
  last_location_lat double precision,
  last_location_lng double precision,
  location_updated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxi_drivers TO authenticated;
GRANT ALL ON public.taxi_drivers TO service_role;
ALTER TABLE public.taxi_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxi drivers own or admin read" ON public.taxi_drivers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.taxi_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL UNIQUE,
  traveler_id uuid NOT NULL,
  driver_id uuid REFERENCES public.taxi_drivers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','arrived','in_progress','completed','cancelled')),
  origin_label text NOT NULL,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  destination_label text NOT NULL,
  destination_lat double precision NOT NULL,
  destination_lng double precision NOT NULL,
  distance_km numeric(7,2) NOT NULL,
  estimated_minutes integer NOT NULL,
  fare_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  passengers integer NOT NULL DEFAULT 1 CHECK (passengers BETWEEN 1 AND 6),
  requested_for timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL DEFAULT 'efectivo' CHECK (payment_method = 'efectivo'),
  cash_paid boolean NOT NULL DEFAULT false,
  traveler_name text NOT NULL,
  traveler_phone text NOT NULL,
  notes text,
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxi_rides TO authenticated;
GRANT ALL ON public.taxi_rides TO service_role;
ALTER TABLE public.taxi_rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxi rides participant or admin read" ON public.taxi_rides FOR SELECT TO authenticated
USING (
  traveler_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (SELECT 1 FROM public.taxi_drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
);
CREATE UNIQUE INDEX taxi_one_active_ride_per_traveler ON public.taxi_rides(traveler_id)
WHERE status IN ('requested','accepted','arrived','in_progress');
CREATE UNIQUE INDEX taxi_one_active_ride_per_driver ON public.taxi_rides(driver_id)
WHERE driver_id IS NOT NULL AND status IN ('accepted','arrived','in_progress');
CREATE INDEX taxi_rides_admin_timeline ON public.taxi_rides(created_at DESC);
CREATE INDEX taxi_rides_open ON public.taxi_rides(status, requested_for) WHERE status = 'requested';

CREATE TABLE public.taxi_ride_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.taxi_rides(id) ON DELETE CASCADE,
  actor_user_id uuid,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxi_ride_events TO authenticated;
GRANT ALL ON public.taxi_ride_events TO service_role;
ALTER TABLE public.taxi_ride_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taxi ride events participant or admin read" ON public.taxi_ride_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.taxi_rides r
  WHERE r.id = ride_id AND (
    r.traveler_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.taxi_drivers d WHERE d.id = r.driver_id AND d.user_id = auth.uid())
  )
));
CREATE INDEX taxi_ride_events_timeline ON public.taxi_ride_events(ride_id, created_at);

INSERT INTO public.platform_settings (key, value, is_public, description)
VALUES (
  'taxi_alux.settings',
  '{"enabled":false,"base_fare_cents":4000,"per_km_cents":1800,"per_minute_cents":400,"minimum_fare_cents":8000,"night_surcharge_bps":1500,"currency":"MXN"}'::jsonb,
  false,
  'Taxi Alux: activación administrativa y tarifa en centavos; pago únicamente en efectivo.'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.taxi_public_config()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v jsonb;
BEGIN
  SELECT value INTO v FROM public.platform_settings WHERE key = 'taxi_alux.settings';
  v := COALESCE(v, '{"enabled":false}'::jsonb);
  RETURN jsonb_build_object(
    'enabled', COALESCE((v->>'enabled')::boolean, false),
    'base_fare_cents', COALESCE((v->>'base_fare_cents')::integer, 4000),
    'per_km_cents', COALESCE((v->>'per_km_cents')::integer, 1800),
    'per_minute_cents', COALESCE((v->>'per_minute_cents')::integer, 400),
    'minimum_fare_cents', COALESCE((v->>'minimum_fare_cents')::integer, 8000),
    'night_surcharge_bps', COALESCE((v->>'night_surcharge_bps')::integer, 1500),
    'currency', COALESCE(v->>'currency', 'MXN'),
    'available_drivers', (SELECT count(*) FROM public.taxi_drivers WHERE approved AND is_available)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_public_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_public_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.taxi_quote(
  _origin_lat double precision,
  _origin_lng double precision,
  _destination_lat double precision,
  _destination_lng double precision,
  _requested_for timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v jsonb;
  v_km double precision;
  v_road_km double precision;
  v_minutes integer;
  v_night boolean;
  v_raw integer;
  v_fare integer;
  v_local_time time;
BEGIN
  SELECT value INTO v FROM public.platform_settings WHERE key = 'taxi_alux.settings';
  v := COALESCE(v, '{"enabled":false}'::jsonb);
  IF NOT COALESCE((v->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'taxi_service_disabled'; END IF;
  IF _origin_lat NOT BETWEEN -90 AND 90 OR _destination_lat NOT BETWEEN -90 AND 90
     OR _origin_lng NOT BETWEEN -180 AND 180 OR _destination_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'invalid_coordinates';
  END IF;
  v_km := 2 * 6371 * asin(sqrt(
    power(sin((radians(_destination_lat) - radians(_origin_lat)) / 2), 2) +
    cos(radians(_origin_lat)) * cos(radians(_destination_lat)) *
    power(sin((radians(_destination_lng) - radians(_origin_lng)) / 2), 2)
  ));
  v_road_km := v_km * 1.22;
  IF v_road_km < 0.1 OR v_road_km > 500 THEN RAISE EXCEPTION 'invalid_taxi_distance'; END IF;
  v_minutes := greatest(5, ceil((v_road_km / 32.0) * 60 + 3));
  v_local_time := (_requested_for AT TIME ZONE 'America/Merida')::time;
  v_night := v_local_time >= time '20:00' OR v_local_time < time '06:00';
  v_raw := round((
    COALESCE((v->>'base_fare_cents')::integer, 4000) +
    v_road_km * COALESCE((v->>'per_km_cents')::integer, 1800) +
    v_minutes * COALESCE((v->>'per_minute_cents')::integer, 400)
  ) * (1 + CASE WHEN v_night THEN COALESCE((v->>'night_surcharge_bps')::integer, 1500) / 10000.0 ELSE 0 END));
  v_fare := greatest(
    COALESCE((v->>'minimum_fare_cents')::integer, 8000),
    (ceil(v_raw / 500.0) * 500)::integer
  );
  RETURN jsonb_build_object(
    'distance_km', round(v_road_km::numeric, 2),
    'estimated_minutes', v_minutes,
    'fare_amount', v_fare,
    'currency', COALESCE(v->>'currency', 'MXN'),
    'night_surcharge', v_night
  );
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_quote(double precision,double precision,double precision,double precision,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_quote(double precision,double precision,double precision,double precision,timestamptz) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._taxi_notify(_r public.taxi_rides, _recipient uuid, _audience text, _event text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_id text; v_payload jsonb; v_url text;
BEGIN
  IF _recipient IS NULL THEN RETURN; END IF;
  v_id := _event || ':' || _r.id::text || ':' || _r.status || ':' || _recipient::text;
  v_url := CASE WHEN _audience = 'driver' THEN '/taxista' ELSE '/cuenta/taxi' END;
  v_payload := jsonb_build_object(
    'ride_id', _r.id, 'folio', _r.folio, 'status', _r.status,
    'url', v_url, 'alt_text', 'Taxi Alux · ' || _r.folio || ' · ' || _r.status
  );
  PERFORM public.unc_publish_in_app(v_id, _event, _recipient, _audience, 'transactional', v_payload);
  INSERT INTO public.notification_deliveries (event_id, event_type, category, channel, recipient_user_id, audience, status, payload_ref)
  VALUES (v_id, _event, 'transactional', 'push', _recipient, _audience, 'pending', v_payload)
  ON CONFLICT (event_id, channel, recipient_user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public._taxi_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER taxi_drivers_touch BEFORE UPDATE ON public.taxi_drivers FOR EACH ROW EXECUTE FUNCTION public._taxi_touch();
CREATE TRIGGER taxi_rides_touch BEFORE UPDATE ON public.taxi_rides FOR EACH ROW EXECUTE FUNCTION public._taxi_touch();

CREATE OR REPLACE FUNCTION public._taxi_ride_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE d record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public._taxi_notify(NEW, NEW.traveler_id, 'traveler', 'taxi.requested');
    FOR d IN SELECT user_id FROM public.taxi_drivers WHERE approved AND is_available LOOP
      PERFORM public._taxi_notify(NEW, d.user_id, 'driver', 'taxi.requested');
    END LOOP;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
    PERFORM public._taxi_notify(NEW, NEW.traveler_id, 'traveler', 'taxi.' || NEW.status);
    IF NEW.driver_id IS NOT NULL THEN
      PERFORM public._taxi_notify(
        NEW,
        (SELECT user_id FROM public.taxi_drivers WHERE id = NEW.driver_id),
        'driver',
        'taxi.' || NEW.status
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER taxi_ride_notifications AFTER INSERT OR UPDATE OF status, driver_id ON public.taxi_rides
FOR EACH ROW EXECUTE FUNCTION public._taxi_ride_notifications();

CREATE OR REPLACE FUNCTION public.taxi_request_ride(
  _origin_label text,
  _origin_lat double precision,
  _origin_lng double precision,
  _destination_label text,
  _destination_lat double precision,
  _destination_lng double precision,
  _passengers integer,
  _requested_for timestamptz,
  _traveler_name text,
  _traveler_phone text,
  _notes text DEFAULT NULL,
  _payment_method text DEFAULT 'efectivo'
)
RETURNS public.taxi_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_quote jsonb; v_ride public.taxi_rides; v_config jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF _payment_method <> 'efectivo' THEN RAISE EXCEPTION 'cash_only'; END IF;
  IF length(btrim(COALESCE(_origin_label,''))) < 3 OR length(btrim(COALESCE(_destination_label,''))) < 3
     OR length(btrim(COALESCE(_traveler_name,''))) < 2 OR length(btrim(COALESCE(_traveler_phone,''))) < 8 THEN
    RAISE EXCEPTION 'missing_ride_details';
  END IF;
  IF _passengers NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'invalid_passengers'; END IF;
  IF _requested_for < now() - interval '5 minutes' OR _requested_for > now() + interval '90 days' THEN
    RAISE EXCEPTION 'invalid_requested_for';
  END IF;
  IF EXISTS (SELECT 1 FROM public.taxi_rides WHERE traveler_id = auth.uid() AND status IN ('requested','accepted','arrived','in_progress')) THEN
    RAISE EXCEPTION 'active_ride_exists';
  END IF;
  v_config := public.taxi_public_config();
  IF NOT (v_config->>'enabled')::boolean THEN RAISE EXCEPTION 'taxi_service_disabled'; END IF;
  IF COALESCE((v_config->>'available_drivers')::integer, 0) < 1 THEN RAISE EXCEPTION 'no_drivers_available'; END IF;
  v_quote := public.taxi_quote(_origin_lat, _origin_lng, _destination_lat, _destination_lng, _requested_for);
  INSERT INTO public.taxi_rides (
    folio, traveler_id, origin_label, origin_lat, origin_lng,
    destination_label, destination_lat, destination_lng,
    distance_km, estimated_minutes, fare_amount, currency,
    passengers, requested_for, payment_method, traveler_name, traveler_phone, notes
  ) VALUES (
    'TAXI-' || upper(substr(gen_random_uuid()::text, 1, 8)), auth.uid(),
    btrim(_origin_label), _origin_lat, _origin_lng,
    btrim(_destination_label), _destination_lat, _destination_lng,
    (v_quote->>'distance_km')::numeric, (v_quote->>'estimated_minutes')::integer,
    (v_quote->>'fare_amount')::integer, v_quote->>'currency',
    _passengers, _requested_for, 'efectivo', btrim(_traveler_name), btrim(_traveler_phone), NULLIF(btrim(COALESCE(_notes,'')), '')
  ) RETURNING * INTO v_ride;
  INSERT INTO public.taxi_ride_events (ride_id, actor_user_id, event_type, to_status)
  VALUES (v_ride.id, auth.uid(), 'requested', 'requested');
  RETURN v_ride;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_request_ride(text,double precision,double precision,text,double precision,double precision,integer,timestamptz,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_request_ride(text,double precision,double precision,text,double precision,double precision,integer,timestamptz,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_admin_save_settings(
  _enabled boolean,
  _base_fare_cents integer,
  _per_km_cents integer,
  _per_minute_cents integer,
  _minimum_fare_cents integer,
  _night_surcharge_bps integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF least(_base_fare_cents,_per_km_cents,_per_minute_cents,_minimum_fare_cents,_night_surcharge_bps) < 0
     OR _base_fare_cents > 1000000 OR _per_km_cents > 1000000 OR _per_minute_cents > 100000
     OR _minimum_fare_cents > 2000000 OR _night_surcharge_bps > 10000 THEN
    RAISE EXCEPTION 'invalid_taxi_fares';
  END IF;
  UPDATE public.taxi_drivers SET is_available = false WHERE NOT _enabled;
  INSERT INTO public.platform_settings (key, value, is_public, description, updated_by)
  VALUES ('taxi_alux.settings', jsonb_build_object(
    'enabled', _enabled, 'base_fare_cents', _base_fare_cents,
    'per_km_cents', _per_km_cents, 'per_minute_cents', _per_minute_cents,
    'minimum_fare_cents', _minimum_fare_cents, 'night_surcharge_bps', _night_surcharge_bps,
    'currency', 'MXN'
  ), false, 'Taxi Alux: activación administrativa y tarifa en centavos; pago únicamente en efectivo.', auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_admin_save_settings(boolean,integer,integer,integer,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_admin_save_settings(boolean,integer,integer,integer,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_admin_upsert_driver(
  _user_id uuid,
  _display_name text,
  _email text,
  _phone text,
  _english boolean,
  _languages text[],
  _license_number text,
  _vehicle_description text,
  _plates text,
  _insurance_reference text,
  _approved boolean
)
RETURNS public.taxi_drivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v public.taxi_drivers;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_id IS NULL OR length(btrim(COALESCE(_display_name,''))) < 2 OR _email !~* '^[^@]+@[^@]+\.[^@]+$'
     OR length(btrim(COALESCE(_vehicle_description,''))) < 2 OR length(btrim(COALESCE(_plates,''))) < 2 THEN
    RAISE EXCEPTION 'missing_driver_details';
  END IF;
  IF _approved AND NOT _english THEN RAISE EXCEPTION 'driver_english_required'; END IF;
  INSERT INTO public.taxi_drivers (
    user_id, display_name, email, phone, english, languages, license_number,
    vehicle_description, plates, insurance_reference, approved, created_by
  ) VALUES (
    _user_id, btrim(_display_name), lower(btrim(_email)), NULLIF(btrim(COALESCE(_phone,'')),''),
    _english, COALESCE(NULLIF(_languages,'{}'), ARRAY['es']::text[]), NULLIF(btrim(COALESCE(_license_number,'')),''),
    btrim(_vehicle_description), upper(btrim(_plates)), NULLIF(btrim(COALESCE(_insurance_reference,'')),''),
    _approved, auth.uid()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name=EXCLUDED.display_name, email=EXCLUDED.email, phone=EXCLUDED.phone,
    english=EXCLUDED.english, languages=EXCLUDED.languages, license_number=EXCLUDED.license_number,
    vehicle_description=EXCLUDED.vehicle_description, plates=EXCLUDED.plates,
    insurance_reference=EXCLUDED.insurance_reference, approved=EXCLUDED.approved,
    is_available=CASE WHEN EXCLUDED.approved THEN public.taxi_drivers.is_available ELSE false END
  RETURNING * INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_admin_upsert_driver(uuid,text,text,text,boolean,text[],text,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_admin_upsert_driver(uuid,text,text,text,boolean,text[],text,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_admin_set_driver_approval(_driver_id uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.taxi_drivers SET approved=_approved, is_available=CASE WHEN _approved THEN is_available ELSE false END WHERE id=_driver_id;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_admin_set_driver_approval(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_admin_set_driver_approval(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_driver_set_available(_available boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v public.taxi_drivers; v_enabled boolean;
BEGIN
  SELECT * INTO v FROM public.taxi_drivers WHERE user_id=auth.uid() AND approved FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'driver_not_approved'; END IF;
  SELECT COALESCE((value->>'enabled')::boolean,false) INTO v_enabled FROM public.platform_settings WHERE key='taxi_alux.settings';
  IF _available AND NOT v_enabled THEN RAISE EXCEPTION 'taxi_service_disabled'; END IF;
  IF _available AND EXISTS (SELECT 1 FROM public.taxi_rides WHERE driver_id=v.id AND status IN ('accepted','arrived','in_progress')) THEN
    RAISE EXCEPTION 'driver_has_active_ride';
  END IF;
  UPDATE public.taxi_drivers SET is_available=_available WHERE id=v.id;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_driver_set_available(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_driver_set_available(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_driver_open_rides()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_driver uuid;
BEGIN
  SELECT id INTO v_driver FROM public.taxi_drivers WHERE user_id=auth.uid() AND approved AND is_available;
  IF v_driver IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'folio', r.folio, 'status', r.status,
    'origin_label', r.origin_label, 'origin_lat', r.origin_lat, 'origin_lng', r.origin_lng,
    'destination_label', r.destination_label, 'destination_lat', r.destination_lat, 'destination_lng', r.destination_lng,
    'distance_km', r.distance_km, 'estimated_minutes', r.estimated_minutes,
    'fare_amount', r.fare_amount, 'currency', r.currency, 'passengers', r.passengers,
    'requested_for', r.requested_for, 'created_at', r.created_at
  ) ORDER BY r.created_at) FROM public.taxi_rides r WHERE r.status='requested'), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_driver_open_rides() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_driver_open_rides() TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_driver_accept_ride(_ride_id uuid)
RETURNS public.taxi_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_driver public.taxi_drivers; v_ride public.taxi_rides;
BEGIN
  SELECT * INTO v_driver FROM public.taxi_drivers WHERE user_id=auth.uid() AND approved AND is_available;
  IF v_driver.id IS NULL THEN RAISE EXCEPTION 'driver_not_available'; END IF;
  UPDATE public.taxi_rides SET driver_id=v_driver.id, status='accepted', accepted_at=now()
  WHERE id=_ride_id AND status='requested' AND driver_id IS NULL
  RETURNING * INTO v_ride;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'ride_no_longer_available'; END IF;
  UPDATE public.taxi_drivers SET is_available=false WHERE id=v_driver.id;
  INSERT INTO public.taxi_ride_events (ride_id,actor_user_id,event_type,from_status,to_status)
  VALUES (_ride_id,auth.uid(),'accepted','requested','accepted');
  RETURN v_ride;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_driver_accept_ride(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_driver_accept_ride(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_driver_set_ride_status(_ride_id uuid, _status text)
RETURNS public.taxi_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_driver public.taxi_drivers; v_ride public.taxi_rides; v_previous text;
BEGIN
  SELECT * INTO v_driver FROM public.taxi_drivers WHERE user_id=auth.uid() AND approved;
  IF v_driver.id IS NULL THEN RAISE EXCEPTION 'driver_not_approved'; END IF;
  SELECT status INTO v_previous FROM public.taxi_rides WHERE id=_ride_id AND driver_id=v_driver.id FOR UPDATE;
  IF v_previous IS NULL THEN RAISE EXCEPTION 'ride_not_assigned'; END IF;
  IF NOT ((_status='arrived' AND v_previous='accepted') OR
          (_status='in_progress' AND v_previous='arrived') OR
          (_status='completed' AND v_previous='in_progress')) THEN
    RAISE EXCEPTION 'invalid_ride_transition';
  END IF;
  UPDATE public.taxi_rides SET
    status=_status,
    arrived_at=CASE WHEN _status='arrived' THEN now() ELSE arrived_at END,
    started_at=CASE WHEN _status='in_progress' THEN now() ELSE started_at END,
    completed_at=CASE WHEN _status='completed' THEN now() ELSE completed_at END,
    cash_paid=CASE WHEN _status='completed' THEN true ELSE cash_paid END
  WHERE id=_ride_id RETURNING * INTO v_ride;
  IF _status='completed' THEN UPDATE public.taxi_drivers SET is_available=true WHERE id=v_driver.id; END IF;
  INSERT INTO public.taxi_ride_events (ride_id,actor_user_id,event_type,from_status,to_status)
  VALUES (_ride_id,auth.uid(),_status,v_previous,_status);
  RETURN v_ride;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_driver_set_ride_status(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_driver_set_ride_status(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_driver_update_location(_lat double precision, _lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'invalid_coordinates'; END IF;
  UPDATE public.taxi_drivers d SET last_location_lat=_lat,last_location_lng=_lng,location_updated_at=now()
  WHERE d.user_id=auth.uid() AND d.approved AND (
    d.is_available OR EXISTS (SELECT 1 FROM public.taxi_rides r WHERE r.driver_id=d.id AND r.status IN ('accepted','arrived','in_progress'))
  );
  IF NOT FOUND THEN RAISE EXCEPTION 'driver_location_not_active'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_driver_update_location(double precision,double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_driver_update_location(double precision,double precision) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_cancel_ride(_ride_id uuid, _reason text DEFAULT NULL)
RETURNS public.taxi_rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_ride public.taxi_rides; v_previous text; v_driver uuid; v_admin boolean;
BEGIN
  v_admin := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin');
  SELECT status,driver_id INTO v_previous,v_driver FROM public.taxi_rides
  WHERE id=_ride_id AND (traveler_id=auth.uid() OR v_admin) FOR UPDATE;
  IF v_previous IS NULL THEN RAISE EXCEPTION 'ride_not_found'; END IF;
  IF v_previous NOT IN ('requested','accepted') THEN RAISE EXCEPTION 'ride_cannot_be_cancelled'; END IF;
  UPDATE public.taxi_rides SET status='cancelled',cancelled_at=now(),cancel_reason=NULLIF(btrim(COALESCE(_reason,'')),'')
  WHERE id=_ride_id RETURNING * INTO v_ride;
  IF v_driver IS NOT NULL THEN UPDATE public.taxi_drivers SET is_available=true WHERE id=v_driver AND approved; END IF;
  INSERT INTO public.taxi_ride_events (ride_id,actor_user_id,event_type,from_status,to_status,note)
  VALUES (_ride_id,auth.uid(),'cancelled',v_previous,'cancelled',v_ride.cancel_reason);
  RETURN v_ride;
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_cancel_ride(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_cancel_ride(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.taxi_ride_tracking(_ride_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE v_ride public.taxi_rides;
BEGIN
  SELECT * INTO v_ride FROM public.taxi_rides WHERE id=_ride_id;
  IF v_ride.id IS NULL OR NOT (
    v_ride.traveler_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR
    EXISTS (SELECT 1 FROM public.taxi_drivers d WHERE d.id=v_ride.driver_id AND d.user_id=auth.uid())
  ) THEN RAISE EXCEPTION 'ride_not_found'; END IF;
  IF v_ride.driver_id IS NULL THEN RETURN NULL; END IF;
  RETURN (SELECT jsonb_build_object(
    'driver_id',d.id,'display_name',d.display_name,'vehicle_description',d.vehicle_description,
    'plates',d.plates,'languages',d.languages,'english',d.english,
    'lat',d.last_location_lat,'lng',d.last_location_lng,'location_updated_at',d.location_updated_at,
    'location_stale',d.location_updated_at IS NULL OR d.location_updated_at < now()-interval '2 minutes'
  ) FROM public.taxi_drivers d WHERE d.id=v_ride.driver_id);
END;
$$;
REVOKE ALL ON FUNCTION public.taxi_ride_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_ride_tracking(uuid) TO authenticated;
