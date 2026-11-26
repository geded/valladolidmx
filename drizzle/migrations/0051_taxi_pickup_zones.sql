CREATE OR REPLACE FUNCTION public.taxi_pickup_zones()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v jsonb; v_slugs text[]; v_radius integer;
BEGIN
  SELECT value INTO v FROM public.platform_settings WHERE key = 'taxi_alux.pickup_zones';
  v_slugs := COALESCE(ARRAY(SELECT jsonb_array_elements_text(v->'destinations')), ARRAY['valladolid']);
  v_radius := LEAST(GREATEST(COALESCE((v->>'radius_km')::integer, 30), 3), 80);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('slug', d.slug, 'name', d.name, 'lat', d.latitude, 'lng', d.longitude, 'radius_km', v_radius) ORDER BY d.name)
    FROM public.destinations d
    WHERE d.slug = ANY(v_slugs) AND d.deleted_at IS NULL AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.taxi_pickup_allowed(_lat double precision, _lng double precision)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.taxi_pickup_zones()) z
    WHERE sqrt(power((_lat - (z->>'lat')::float8) * 111, 2) + power((_lng - (z->>'lng')::float8) * 104, 2)) <= (z->>'radius_km')::float8
  );
$$;

CREATE OR REPLACE FUNCTION public.taxi_admin_set_pickup_zones(_slugs text[], _radius_km integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _radius_km NOT BETWEEN 3 AND 80 OR COALESCE(array_length(_slugs, 1), 0) > 50 THEN RAISE EXCEPTION 'invalid_pickup_zones'; END IF;
  INSERT INTO public.platform_settings (key, value, is_public, description, updated_by)
  VALUES ('taxi_alux.pickup_zones', jsonb_build_object('destinations', to_jsonb(COALESCE(_slugs, ARRAY[]::text[])), 'radius_km', _radius_km), false,
    'Taxi Alux: destinos desde donde ya pueden salir taxis.', auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.taxi_public_config()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
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
    'available_drivers', (SELECT count(*) FROM public.taxi_drivers WHERE approved AND is_available),
    'pickup_zones', public.taxi_pickup_zones()
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.taxi_request_ride(_origin_label text, _origin_lat double precision, _origin_lng double precision, _destination_label text, _destination_lat double precision, _destination_lng double precision, _passengers integer, _requested_for timestamp with time zone, _traveler_name text, _traveler_phone text, _notes text DEFAULT NULL::text, _payment_method text DEFAULT 'efectivo'::text)
 RETURNS taxi_rides LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  IF NOT public.taxi_pickup_allowed(_origin_lat, _origin_lng) THEN RAISE EXCEPTION 'pickup_outside_zone'; END IF;
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
END; $function$;

REVOKE ALL ON FUNCTION public.taxi_admin_set_pickup_zones(text[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.taxi_admin_set_pickup_zones(text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.taxi_pickup_zones() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.taxi_pickup_allowed(double precision, double precision) TO anon, authenticated;