DO $mig$
DECLARE d text; n text;
BEGIN
  SELECT pg_get_functiondef('public.taxi_quote(double precision,double precision,double precision,double precision,timestamp with time zone,text,text,integer,jsonb)'::regprocedure) INTO d;
  n := replace(d, $q$_stops jsonb DEFAULT '[]'::jsonb)$q$, $q$_stops jsonb DEFAULT '[]'::jsonb, _road_km double precision DEFAULT NULL::double precision)$q$);
  n := replace(n, 'IF v_km < 0.1 OR v_km > 600', 'IF _road_km IS NOT NULL AND _road_km >= v_km AND _road_km <= v_km * 4 + 2 THEN v_km := _road_km; END IF;
  IF v_km < 0.1 OR v_km > 600');
  IF n = d OR position('_road_km >= v_km' in n) = 0 THEN RAISE EXCEPTION 'quote patch failed'; END IF;
  DROP FUNCTION public.taxi_quote(double precision,double precision,double precision,double precision,timestamp with time zone,text,text,integer,jsonb);
  EXECUTE n;

  SELECT pg_get_functiondef('public.taxi_request_ride(text,double precision,double precision,text,double precision,double precision,integer,timestamp with time zone,text,text,text,text,text,text,integer,jsonb)'::regprocedure) INTO d;
  n := replace(d, $q$_stops jsonb DEFAULT '[]'::jsonb)$q$, $q$_stops jsonb DEFAULT '[]'::jsonb, _road_km double precision DEFAULT NULL::double precision)$q$);
  n := replace(n, '_trip_mode, _hours, _stops);', '_trip_mode, _hours, _stops, _road_km);');
  IF position('_stops, _road_km);' in n) = 0 THEN RAISE EXCEPTION 'request patch failed'; END IF;
  DROP FUNCTION public.taxi_request_ride(text,double precision,double precision,text,double precision,double precision,integer,timestamp with time zone,text,text,text,text,text,text,integer,jsonb);
  EXECUTE n;
END $mig$;
REVOKE ALL ON FUNCTION public.taxi_quote(double precision,double precision,double precision,double precision,timestamp with time zone,text,text,integer,jsonb,double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.taxi_quote(double precision,double precision,double precision,double precision,timestamp with time zone,text,text,integer,jsonb,double precision) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.taxi_request_ride(text,double precision,double precision,text,double precision,double precision,integer,timestamp with time zone,text,text,text,text,text,text,integer,jsonb,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.taxi_request_ride(text,double precision,double precision,text,double precision,double precision,integer,timestamp with time zone,text,text,text,text,text,text,integer,jsonb,double precision) TO authenticated, service_role;