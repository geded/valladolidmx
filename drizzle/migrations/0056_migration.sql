-- Taxi Alux: tipos de vehículo, espera, paradas y viajes por horas (ida y vuelta)
ALTER TABLE public.taxi_drivers ADD COLUMN IF NOT EXISTS vehicle_class text NOT NULL DEFAULT 'compacto';
ALTER TABLE public.taxi_driver_invitations ADD COLUMN IF NOT EXISTS vehicle_class text NOT NULL DEFAULT 'compacto';
ALTER TABLE public.taxi_rides
  ADD COLUMN IF NOT EXISTS vehicle_class text NOT NULL DEFAULT 'compacto',
  ADD COLUMN IF NOT EXISTS trip_mode text NOT NULL DEFAULT 'one_way',
  ADD COLUMN IF NOT EXISTS hours integer,
  ADD COLUMN IF NOT EXISTS stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fare_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS wait_charge_cents integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.taxi_drivers ADD CONSTRAINT taxi_drivers_vehicle_class_chk CHECK (vehicle_class IN ('compacto','camioneta','van'));
  ALTER TABLE public.taxi_driver_invitations ADD CONSTRAINT taxi_inv_vehicle_class_chk CHECK (vehicle_class IN ('compacto','camioneta','van'));
  ALTER TABLE public.taxi_rides ADD CONSTRAINT taxi_rides_vehicle_class_chk CHECK (vehicle_class IN ('compacto','camioneta','van'));
  ALTER TABLE public.taxi_rides ADD CONSTRAINT taxi_rides_trip_mode_chk CHECK (trip_mode IN ('one_way','hourly'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reglas de flota con valores de prueba; el administrador las ajusta.
CREATE OR REPLACE FUNCTION public.taxi_fleet()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v jsonb; f jsonb;
BEGIN
  SELECT value->'fleet' INTO f FROM public.platform_settings WHERE key = 'taxi_alux.settings';
  v := jsonb_build_object(
    'classes', jsonb_build_array(
      jsonb_build_object('key','compacto','label','Compacto','seats',4,'multiplier_bps',10000),
      jsonb_build_object('key','camioneta','label','Camioneta','seats',6,'multiplier_bps',16000),
      jsonb_build_object('key','van','label','Van','seats',10,'multiplier_bps',22000)),
    'wait_free_minutes', 3, 'wait_per_minute_cents', 300,
    'stop_fee_cents', 1500, 'max_stops', 2,
    'hourly_enabled', true, 'hourly_cents', 25000, 'hourly_min_hours', 2,
    'hourly_max_hours', 10, 'hourly_included_km', 20);
  RETURN v || COALESCE(f, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.taxi_class_info(_class text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c FROM jsonb_array_elements(public.taxi_fleet()->'classes') c WHERE c->>'key' = _class LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.taxi_km(_a_lat double precision, _a_lng double precision, _b_lat double precision, _b_lng double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT 2 * 6371 * asin(sqrt(power(sin((radians(_b_lat) - radians(_a_lat)) / 2), 2) +
    cos(radians(_a_lat)) * cos(radians(_b_lat)) * power(sin((radians(_b_lng) - radians(_a_lng)) / 2), 2))) * 1.22
$$;

CREATE OR REPLACE FUNCTION public.taxi_public_config()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v jsonb; v_fleet jsonb := public.taxi_fleet();
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
    'available_drivers', (SELECT count(*) FROM public.taxi_drivers WHERE approved AND is_available),
    'drivers_by_class', COALESCE((SELECT jsonb_object_agg(vehicle_class, n) FROM (
        SELECT vehicle_class, count(*) n FROM public.taxi_drivers WHERE approved AND is_available GROUP BY vehicle_class) s), '{}'::jsonb),
    'fleet', v_fleet,
    'pickup_zones', public.taxi_pickup_zones()
  );
END; $function$;

DROP FUNCTION IF EXISTS public.taxi_quote(double precision, double precision, double precision, double precision, timestamp with time zone);
CREATE OR REPLACE FUNCTION public.taxi_quote(
  _origin_lat double precision, _origin_lng double precision,
  _destination_lat double precision, _destination_lng double precision,
  _requested_for timestamp with time zone DEFAULT now(),
  _vehicle_class text DEFAULT 'compacto', _trip_mode text DEFAULT 'one_way',
  _hours integer DEFAULT NULL, _stops jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v jsonb; f jsonb := public.taxi_fleet(); c jsonb;
  v_km double precision := 0; v_minutes integer; v_night boolean; v_mult numeric;
  v_base integer; v_extra_km double precision := 0; v_included_km integer := 0;
  v_stop_count integer; v_stop_fee integer; v_raw numeric; v_fare integer; v_night_cents integer;
  v_prev_lat double precision := _origin_lat; v_prev_lng double precision := _origin_lng; s jsonb;
  v_local_time time;
BEGIN
  SELECT value INTO v FROM public.platform_settings WHERE key = 'taxi_alux.settings';
  v := COALESCE(v, '{"enabled":false}'::jsonb);
  IF NOT COALESCE((v->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'taxi_service_disabled'; END IF;
  IF _origin_lat NOT BETWEEN -90 AND 90 OR _destination_lat NOT BETWEEN -90 AND 90
     OR _origin_lng NOT BETWEEN -180 AND 180 OR _destination_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'invalid_coordinates';
  END IF;
  c := public.taxi_class_info(_vehicle_class);
  IF c IS NULL THEN RAISE EXCEPTION 'invalid_vehicle_class'; END IF;
  IF _trip_mode NOT IN ('one_way','hourly') THEN RAISE EXCEPTION 'invalid_trip_mode'; END IF;
  _stops := COALESCE(_stops, '[]'::jsonb);
  IF jsonb_typeof(_stops) <> 'array' THEN RAISE EXCEPTION 'invalid_stops'; END IF;
  v_stop_count := jsonb_array_length(_stops);
  IF v_stop_count > COALESCE((f->>'max_stops')::integer, 2) THEN RAISE EXCEPTION 'too_many_stops'; END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(_stops) LOOP
    IF (s->>'lat') IS NULL OR (s->>'lng') IS NULL THEN RAISE EXCEPTION 'invalid_stops'; END IF;
    v_km := v_km + public.taxi_km(v_prev_lat, v_prev_lng, (s->>'lat')::double precision, (s->>'lng')::double precision);
    v_prev_lat := (s->>'lat')::double precision; v_prev_lng := (s->>'lng')::double precision;
  END LOOP;
  v_km := v_km + public.taxi_km(v_prev_lat, v_prev_lng, _destination_lat, _destination_lng);
  IF _trip_mode = 'hourly' THEN
    -- ida, paradas y regreso al punto de salida
    v_km := v_km + public.taxi_km(_destination_lat, _destination_lng, _origin_lat, _origin_lng);
  END IF;
  IF v_km < 0.1 OR v_km > 600 THEN RAISE EXCEPTION 'invalid_taxi_distance'; END IF;
  v_minutes := greatest(5, ceil((v_km / 32.0) * 60 + 3));
  v_mult := COALESCE((c->>'multiplier_bps')::integer, 10000) / 10000.0;
  v_stop_fee := v_stop_count * COALESCE((f->>'stop_fee_cents')::integer, 1500);
  v_local_time := (_requested_for AT TIME ZONE 'America/Merida')::time;
  v_night := v_local_time >= time '20:00' OR v_local_time < time '06:00';

  IF _trip_mode = 'hourly' THEN
    IF NOT COALESCE((f->>'hourly_enabled')::boolean, true) THEN RAISE EXCEPTION 'hourly_disabled'; END IF;
    IF _hours IS NULL OR _hours < COALESCE((f->>'hourly_min_hours')::integer, 2)
       OR _hours > COALESCE((f->>'hourly_max_hours')::integer, 10) THEN RAISE EXCEPTION 'invalid_hours'; END IF;
    IF v_minutes > _hours * 60 THEN RAISE EXCEPTION 'hours_too_short'; END IF;
    v_base := round(_hours * COALESCE((f->>'hourly_cents')::integer, 25000) * v_mult);
    v_included_km := _hours * COALESCE((f->>'hourly_included_km')::integer, 20);
    v_extra_km := greatest(0, v_km - v_included_km);
    v_raw := v_base + v_extra_km * COALESCE((v->>'per_km_cents')::integer, 1800) * v_mult;
  ELSE
    _hours := NULL;
    v_base := round((COALESCE((v->>'base_fare_cents')::integer, 4000) +
      v_km * COALESCE((v->>'per_km_cents')::integer, 1800) +
      v_minutes * COALESCE((v->>'per_minute_cents')::integer, 400)) * v_mult);
    v_raw := v_base;
  END IF;
  v_night_cents := CASE WHEN v_night THEN round(v_raw * COALESCE((v->>'night_surcharge_bps')::integer, 1500) / 10000.0) ELSE 0 END;
  v_raw := v_raw + v_night_cents + v_stop_fee;
  v_fare := greatest(round(COALESCE((v->>'minimum_fare_cents')::integer, 8000) * v_mult)::integer,
                     (ceil(v_raw / 500.0) * 500)::integer);
  RETURN jsonb_build_object(
    'distance_km', round(v_km::numeric, 2),
    'estimated_minutes', v_minutes,
    'fare_amount', v_fare,
    'currency', COALESCE(v->>'currency', 'MXN'),
    'night_surcharge', v_night,
    'vehicle_class', _vehicle_class,
    'vehicle_label', c->>'label',
    'seats', (c->>'seats')::integer,
    'trip_mode', _trip_mode,
    'hours', _hours,
    'breakdown', jsonb_build_object(
      'base_cents', v_base,
      'extra_km', round(v_extra_km::numeric, 1),
      'extra_km_cents', round(v_extra_km * COALESCE((v->>'per_km_cents')::integer, 1800) * v_mult),
      'included_km', v_included_km,
      'stops', v_stop_count, 'stop_fee_cents', v_stop_fee,
      'night_cents', v_night_cents,
      'wait_free_minutes', COALESCE((f->>'wait_free_minutes')::integer, 3),
      'wait_per_minute_cents', round(COALESCE((f->>'wait_per_minute_cents')::integer, 300) * v_mult),
      'extra_hour_cents', round(COALESCE((f->>'hourly_cents')::integer, 25000) * v_mult),
      'extra_km_rate_cents', round(COALESCE((v->>'per_km_cents')::integer, 1800) * v_mult))
  );
END; $function$;
GRANT EXECUTE ON FUNCTION public.taxi_quote(double precision, double precision, double precision, double precision, timestamp with time zone, text, text, integer, jsonb) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.taxi_request_ride(text, double precision, double precision, text, double precision, double precision, integer, timestamp with time zone, text, text, text, text);
CREATE OR REPLACE FUNCTION public.taxi_request_ride(_origin_label text, _origin_lat double precision, _origin_lng double precision, _destination_label text, _destination_lat double precision, _destination_lng double precision, _passengers integer, _requested_for timestamp with time zone, _traveler_name text, _traveler_phone text, _notes text DEFAULT NULL::text, _payment_method text DEFAULT 'efectivo'::text,
  _vehicle_class text DEFAULT 'compacto', _trip_mode text DEFAULT 'one_way', _hours integer DEFAULT NULL, _stops jsonb DEFAULT '[]'::jsonb)
RETURNS taxi_rides LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_quote jsonb; v_ride public.taxi_rides; v_config jsonb; c jsonb; v_drivers integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  IF _payment_method <> 'efectivo' THEN RAISE EXCEPTION 'cash_only'; END IF;
  IF length(btrim(COALESCE(_origin_label,''))) < 3 OR length(btrim(COALESCE(_destination_label,''))) < 3
     OR length(btrim(COALESCE(_traveler_name,''))) < 2 OR length(btrim(COALESCE(_traveler_phone,''))) < 8 THEN
    RAISE EXCEPTION 'missing_ride_details';
  END IF;
  c := public.taxi_class_info(_vehicle_class);
  IF c IS NULL THEN RAISE EXCEPTION 'invalid_vehicle_class'; END IF;
  IF _passengers < 1 OR _passengers > (c->>'seats')::integer THEN RAISE EXCEPTION 'vehicle_too_small'; END IF;
  IF _requested_for < now() - interval '5 minutes' OR _requested_for > now() + interval '90 days' THEN
    RAISE EXCEPTION 'invalid_requested_for';
  END IF;
  IF EXISTS (SELECT 1 FROM public.taxi_rides WHERE traveler_id = auth.uid() AND status IN ('requested','accepted','arrived','in_progress')) THEN
    RAISE EXCEPTION 'active_ride_exists';
  END IF;
  v_config := public.taxi_public_config();
  IF NOT (v_config->>'enabled')::boolean THEN RAISE EXCEPTION 'taxi_service_disabled'; END IF;
  IF NOT public.taxi_pickup_allowed(_origin_lat, _origin_lng) THEN RAISE EXCEPTION 'pickup_outside_zone'; END IF;
  SELECT count(*) INTO v_drivers FROM public.taxi_drivers d
   WHERE d.approved AND d.is_available
     AND COALESCE((public.taxi_class_info(d.vehicle_class)->>'seats')::integer, 4) >= (c->>'seats')::integer;
  IF v_drivers < 1 THEN RAISE EXCEPTION 'no_drivers_available'; END IF;
  v_quote := public.taxi_quote(_origin_lat, _origin_lng, _destination_lat, _destination_lng, _requested_for, _vehicle_class, _trip_mode, _hours, _stops);
  INSERT INTO public.taxi_rides (
    folio, traveler_id, origin_label, origin_lat, origin_lng,
    destination_label, destination_lat, destination_lng,
    distance_km, estimated_minutes, fare_amount, currency,
    passengers, requested_for, payment_method, traveler_name, traveler_phone, notes,
    vehicle_class, trip_mode, hours, stops, fare_breakdown
  ) VALUES (
    'TAXI-' || upper(substr(gen_random_uuid()::text, 1, 8)), auth.uid(),
    btrim(_origin_label), _origin_lat, _origin_lng,
    btrim(_destination_label), _destination_lat, _destination_lng,
    (v_quote->>'distance_km')::numeric, (v_quote->>'estimated_minutes')::integer,
    (v_quote->>'fare_amount')::integer, v_quote->>'currency',
    _passengers, _requested_for, 'efectivo', btrim(_traveler_name), btrim(_traveler_phone), NULLIF(btrim(COALESCE(_notes,'')), ''),
    _vehicle_class, _trip_mode, (v_quote->>'hours')::integer, COALESCE(_stops,'[]'::jsonb), v_quote->'breakdown'
  ) RETURNING * INTO v_ride;
  INSERT INTO public.taxi_ride_events (ride_id, actor_user_id, event_type, to_status)
  VALUES (v_ride.id, auth.uid(), 'requested', 'requested');
  RETURN v_ride;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.taxi_request_ride(text, double precision, double precision, text, double precision, double precision, integer, timestamp with time zone, text, text, text, text, text, text, integer, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.taxi_request_ride(text, double precision, double precision, text, double precision, double precision, integer, timestamp with time zone, text, text, text, text, text, text, integer, jsonb) TO authenticated, service_role;

-- Los taxistas sólo ven y aceptan viajes que caben en su vehículo.
CREATE OR REPLACE FUNCTION public.taxi_driver_open_rides()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_driver uuid; v_seats integer;
BEGIN
  SELECT id, COALESCE((public.taxi_class_info(vehicle_class)->>'seats')::integer, 4) INTO v_driver, v_seats
    FROM public.taxi_drivers WHERE user_id=auth.uid() AND approved AND is_available;
  IF v_driver IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'folio', r.folio, 'status', r.status,
    'origin_label', r.origin_label, 'origin_lat', r.origin_lat, 'origin_lng', r.origin_lng,
    'destination_label', r.destination_label, 'destination_lat', r.destination_lat, 'destination_lng', r.destination_lng,
    'distance_km', r.distance_km, 'estimated_minutes', r.estimated_minutes,
    'fare_amount', r.fare_amount, 'currency', r.currency, 'passengers', r.passengers,
    'requested_for', r.requested_for, 'created_at', r.created_at,
    'vehicle_class', r.vehicle_class, 'trip_mode', r.trip_mode, 'hours', r.hours, 'stops', r.stops
  ) ORDER BY r.created_at) FROM public.taxi_rides r
    WHERE r.status='requested'
      AND COALESCE((public.taxi_class_info(r.vehicle_class)->>'seats')::integer, 4) <= v_seats), '[]'::jsonb);
END; $function$;

CREATE OR REPLACE FUNCTION public.taxi_driver_accept_ride(_ride_id uuid)
RETURNS taxi_rides LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_driver public.taxi_drivers; v_ride public.taxi_rides; v_seats integer;
BEGIN
  SELECT * INTO v_driver FROM public.taxi_drivers WHERE user_id=auth.uid() AND approved AND is_available;
  IF v_driver.id IS NULL THEN RAISE EXCEPTION 'driver_not_available'; END IF;
  v_seats := COALESCE((public.taxi_class_info(v_driver.vehicle_class)->>'seats')::integer, 4);
  UPDATE public.taxi_rides SET driver_id=v_driver.id, status='accepted', accepted_at=now()
  WHERE id=_ride_id AND status='requested' AND driver_id IS NULL
    AND COALESCE((public.taxi_class_info(vehicle_class)->>'seats')::integer, 4) <= v_seats
  RETURNING * INTO v_ride;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'ride_no_longer_available'; END IF;
  UPDATE public.taxi_drivers SET is_available=false WHERE id=v_driver.id;
  INSERT INTO public.taxi_ride_events (ride_id,actor_user_id,event_type,from_status,to_status)
  VALUES (_ride_id,auth.uid(),'accepted','requested','accepted');
  RETURN v_ride;
END; $function$;

-- Espera al recoger: minutos gratis y después cobro por minuto, sumado al iniciar el viaje.
CREATE OR REPLACE FUNCTION public._taxi_wait_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f jsonb; v_free integer; v_rate integer; v_mins integer;
BEGIN
  IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL AND NEW.arrived_at IS NOT NULL THEN
    f := public.taxi_fleet();
    v_free := COALESCE((f->>'wait_free_minutes')::integer, 3);
    v_rate := round(COALESCE((f->>'wait_per_minute_cents')::integer, 300) *
      COALESCE((public.taxi_class_info(NEW.vehicle_class)->>'multiplier_bps')::integer, 10000) / 10000.0);
    v_mins := greatest(0, floor(extract(epoch FROM (NEW.started_at - NEW.arrived_at)) / 60)::integer - v_free);
    NEW.wait_charge_cents := v_mins * v_rate;
    NEW.fare_amount := NEW.fare_amount + NEW.wait_charge_cents;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS taxi_rides_wait_charge ON public.taxi_rides;
CREATE TRIGGER taxi_rides_wait_charge BEFORE UPDATE OF started_at ON public.taxi_rides
  FOR EACH ROW EXECUTE FUNCTION public._taxi_wait_charge();

-- Guardar tarifas conserva las reglas de flota.
CREATE OR REPLACE FUNCTION public.taxi_admin_save_settings(_enabled boolean, _base_fare_cents integer, _per_km_cents integer, _per_minute_cents integer, _minimum_fare_cents integer, _night_surcharge_bps integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  ON CONFLICT (key) DO UPDATE SET value = public.platform_settings.value || EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
END; $function$;

CREATE OR REPLACE FUNCTION public.taxi_admin_save_fleet(_fleet jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c jsonb; k text; f jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF jsonb_typeof(_fleet->'classes') <> 'array' OR jsonb_array_length(_fleet->'classes') <> 3 THEN RAISE EXCEPTION 'invalid_fleet'; END IF;
  FOR c IN SELECT * FROM jsonb_array_elements(_fleet->'classes') LOOP
    IF (c->>'key') NOT IN ('compacto','camioneta','van') OR (c->>'seats')::integer NOT BETWEEN 1 AND 20
       OR (c->>'multiplier_bps')::integer NOT BETWEEN 5000 AND 50000 OR length(btrim(COALESCE(c->>'label',''))) < 2 THEN
      RAISE EXCEPTION 'invalid_fleet';
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['wait_free_minutes','wait_per_minute_cents','stop_fee_cents','max_stops','hourly_cents','hourly_min_hours','hourly_max_hours','hourly_included_km'] LOOP
    IF (_fleet->>k) IS NULL OR (_fleet->>k)::integer < 0 OR (_fleet->>k)::integer > 1000000 THEN RAISE EXCEPTION 'invalid_fleet'; END IF;
  END LOOP;
  IF (_fleet->>'max_stops')::integer > 5 OR (_fleet->>'hourly_min_hours')::integer < 1
     OR (_fleet->>'hourly_max_hours')::integer < (_fleet->>'hourly_min_hours')::integer OR (_fleet->>'hourly_max_hours')::integer > 24 THEN
    RAISE EXCEPTION 'invalid_fleet';
  END IF;
  f := jsonb_build_object('classes', _fleet->'classes',
    'wait_free_minutes', (_fleet->>'wait_free_minutes')::integer, 'wait_per_minute_cents', (_fleet->>'wait_per_minute_cents')::integer,
    'stop_fee_cents', (_fleet->>'stop_fee_cents')::integer, 'max_stops', (_fleet->>'max_stops')::integer,
    'hourly_enabled', COALESCE((_fleet->>'hourly_enabled')::boolean, true), 'hourly_cents', (_fleet->>'hourly_cents')::integer,
    'hourly_min_hours', (_fleet->>'hourly_min_hours')::integer, 'hourly_max_hours', (_fleet->>'hourly_max_hours')::integer,
    'hourly_included_km', (_fleet->>'hourly_included_km')::integer);
  INSERT INTO public.platform_settings (key, value, is_public, description, updated_by)
  VALUES ('taxi_alux.settings', jsonb_build_object('enabled', false, 'fleet', f), false,
    'Taxi Alux: activación administrativa y tarifa en centavos; pago únicamente en efectivo.', auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = public.platform_settings.value || jsonb_build_object('fleet', f), updated_by = auth.uid(), updated_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.taxi_admin_save_fleet(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.taxi_admin_save_fleet(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.taxi_admin_set_driver_vehicle_class(_driver_id uuid, _vehicle_class text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _vehicle_class NOT IN ('compacto','camioneta','van') THEN RAISE EXCEPTION 'invalid_vehicle_class'; END IF;
  UPDATE public.taxi_drivers SET vehicle_class = _vehicle_class WHERE id = _driver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'driver_not_found'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.taxi_admin_set_driver_vehicle_class(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.taxi_admin_set_driver_vehicle_class(uuid, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.taxi_submit_driver_invitation(uuid, text, text, text, boolean, text[], text, text, text, text, integer, text, text, text, text);
CREATE OR REPLACE FUNCTION public.taxi_submit_driver_invitation(_token uuid, _full_name text, _email text, _phone text, _english boolean, _languages text[], _union_name text, _license_number text, _insurance_reference text, _vehicle_description text, _vehicle_year integer, _vehicle_color text, _vehicle_number text, _plates text, _applicant_notes text DEFAULT NULL::text, _vehicle_class text DEFAULT 'compacto')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF length(btrim(COALESCE(_full_name,'')))<2 OR _email !~* '^[^@]+@[^@]+\.[^@]+$'
     OR length(btrim(COALESCE(_phone,'')))<8 OR length(btrim(COALESCE(_vehicle_description,'')))<2
     OR length(btrim(COALESCE(_plates,'')))<2 OR length(btrim(COALESCE(_license_number,'')))<2
     OR length(btrim(COALESCE(_insurance_reference,'')))<2 OR length(btrim(COALESCE(_union_name,'')))<2 THEN
    RAISE EXCEPTION 'missing_driver_details';
  END IF;
  IF _vehicle_class NOT IN ('compacto','camioneta','van') THEN RAISE EXCEPTION 'invalid_vehicle_class'; END IF;
  IF _vehicle_year IS NOT NULL AND (_vehicle_year<1990 OR _vehicle_year>2035) THEN RAISE EXCEPTION 'invalid_vehicle_year'; END IF;
  UPDATE public.taxi_driver_invitations SET
    status='submitted',full_name=btrim(_full_name),email=lower(btrim(_email)),phone=btrim(_phone),
    english=_english,languages=COALESCE(NULLIF(_languages,'{}'),ARRAY['es']::text[]),
    union_name=btrim(_union_name),license_number=btrim(_license_number),
    insurance_reference=btrim(_insurance_reference),vehicle_description=btrim(_vehicle_description),
    vehicle_year=_vehicle_year,vehicle_color=NULLIF(btrim(COALESCE(_vehicle_color,'')),''),
    vehicle_number=NULLIF(btrim(COALESCE(_vehicle_number,'')),''),plates=upper(btrim(_plates)),
    applicant_notes=NULLIF(btrim(COALESCE(_applicant_notes,'')),''),submitted_at=now(),
    vehicle_class=_vehicle_class
  WHERE token=_token AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_available'; END IF;
END; $function$;
GRANT EXECUTE ON FUNCTION public.taxi_submit_driver_invitation(uuid, text, text, text, boolean, text[], text, text, text, text, integer, text, text, text, text, text) TO anon, authenticated, service_role;