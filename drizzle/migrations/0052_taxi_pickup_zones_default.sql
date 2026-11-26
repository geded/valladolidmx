CREATE OR REPLACE FUNCTION public.taxi_pickup_zones()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v jsonb; v_slugs text[]; v_radius integer;
BEGIN
  SELECT value INTO v FROM public.platform_settings WHERE key = 'taxi_alux.pickup_zones';
  IF v IS NULL OR jsonb_typeof(v->'destinations') <> 'array' THEN
    v_slugs := ARRAY['valladolid'];
  ELSE
    v_slugs := ARRAY(SELECT jsonb_array_elements_text(v->'destinations'));
  END IF;
  v_radius := LEAST(GREATEST(COALESCE((v->>'radius_km')::integer, 30), 3), 80);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('slug', d.slug, 'name', d.name, 'lat', d.latitude, 'lng', d.longitude, 'radius_km', v_radius) ORDER BY d.name)
    FROM public.destinations d
    WHERE d.slug = ANY(v_slugs) AND d.deleted_at IS NULL AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
  ), '[]'::jsonb);
END; $$;