ALTER TABLE public.taxi_rides
  ADD COLUMN IF NOT EXISTS traveler_rating smallint CHECK (traveler_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS traveler_comment text,
  ADD COLUMN IF NOT EXISTS driver_rating smallint CHECK (driver_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

CREATE OR REPLACE FUNCTION public.taxi_ride_tracking(_ride_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    'vehicle_color',d.vehicle_color,'vehicle_number',d.vehicle_number,
    'phone',CASE WHEN v_ride.status IN ('accepted','arrived','in_progress') THEN d.phone END,
    'rating_avg',(SELECT round(avg(r.traveler_rating)::numeric,1) FROM public.taxi_rides r WHERE r.driver_id=d.id AND r.traveler_rating IS NOT NULL),
    'rating_count',(SELECT count(*) FROM public.taxi_rides r WHERE r.driver_id=d.id AND r.traveler_rating IS NOT NULL),
    'completed_rides',(SELECT count(*) FROM public.taxi_rides r WHERE r.driver_id=d.id AND r.status='completed'),
    'lat',d.last_location_lat,'lng',d.last_location_lng,'location_updated_at',d.location_updated_at,
    'location_stale',d.location_updated_at IS NULL OR d.location_updated_at < now()-interval '2 minutes'
  ) FROM public.taxi_drivers d WHERE d.id=v_ride.driver_id);
END; $$;

CREATE OR REPLACE FUNCTION public.taxi_rate_ride(_ride_id uuid, _rating int, _comment text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_ride public.taxi_rides;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'invalid_rating'; END IF;
  SELECT * INTO v_ride FROM public.taxi_rides WHERE id=_ride_id FOR UPDATE;
  IF v_ride.id IS NULL OR v_ride.status <> 'completed' THEN RAISE EXCEPTION 'ride_not_found'; END IF;
  IF v_ride.traveler_id = auth.uid() THEN
    UPDATE public.taxi_rides SET traveler_rating=_rating, traveler_comment=NULLIF(left(btrim(COALESCE(_comment,'')),500),'') WHERE id=_ride_id;
  ELSIF EXISTS (SELECT 1 FROM public.taxi_drivers d WHERE d.id=v_ride.driver_id AND d.user_id=auth.uid()) THEN
    UPDATE public.taxi_rides SET driver_rating=_rating WHERE id=_ride_id;
  ELSE RAISE EXCEPTION 'ride_not_found'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.taxi_share_ride(_ride_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_token text;
BEGIN
  SELECT share_token INTO v_token FROM public.taxi_rides WHERE id=_ride_id AND traveler_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'ride_not_found'; END IF;
  IF v_token IS NULL THEN
    v_token := encode(gen_random_bytes(18),'hex');
    UPDATE public.taxi_rides SET share_token=v_token WHERE id=_ride_id;
  END IF;
  RETURN v_token;
END; $$;

CREATE OR REPLACE FUNCTION public.taxi_shared_ride(_token text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'folio',r.folio,'status',r.status,'origin_label',r.origin_label,'destination_label',r.destination_label,
    'origin_lat',r.origin_lat,'origin_lng',r.origin_lng,'destination_lat',r.destination_lat,'destination_lng',r.destination_lng,
    'driver_name',split_part(d.display_name,' ',1),'vehicle_description',d.vehicle_description,'vehicle_color',d.vehicle_color,'plates',d.plates,
    'lat',CASE WHEN r.status IN ('accepted','arrived','in_progress') THEN d.last_location_lat END,
    'lng',CASE WHEN r.status IN ('accepted','arrived','in_progress') THEN d.last_location_lng END,
    'location_updated_at',d.location_updated_at,'updated_at',r.updated_at)
  FROM public.taxi_rides r LEFT JOIN public.taxi_drivers d ON d.id=r.driver_id
  WHERE _token IS NOT NULL AND length(_token)=36 AND r.share_token=_token
    AND (r.status IN ('requested','accepted','arrived','in_progress') OR r.updated_at > now()-interval '2 hours');
$$;

REVOKE ALL ON FUNCTION public.taxi_rate_ride(uuid,int,text), public.taxi_share_ride(uuid), public.taxi_shared_ride(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_rate_ride(uuid,int,text), public.taxi_share_ride(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.taxi_shared_ride(text) TO anon, authenticated;