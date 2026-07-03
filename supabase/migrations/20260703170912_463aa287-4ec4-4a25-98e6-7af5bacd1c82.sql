-- Fase 4.0 · Infraestructura Demo Seed
-- Marca registros sembrados desde datos públicos para poder actualizarlos/purgarlos
-- sin tocar contenido real de negocio. Aplica a superficies pobladas por el Demo Pack.

ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

ALTER TABLE public.destination_zones
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

ALTER TABLE public.points_of_interest
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS is_demo_seed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch TEXT,
  ADD COLUMN IF NOT EXISTS demo_source_url TEXT;

-- Índices para consultas de inventario/purga por batch
CREATE INDEX IF NOT EXISTS idx_destinations_demo_seed ON public.destinations(demo_seed_batch) WHERE is_demo_seed = true;
CREATE INDEX IF NOT EXISTS idx_destination_zones_demo_seed ON public.destination_zones(demo_seed_batch) WHERE is_demo_seed = true;
CREATE INDEX IF NOT EXISTS idx_points_of_interest_demo_seed ON public.points_of_interest(demo_seed_batch) WHERE is_demo_seed = true;
CREATE INDEX IF NOT EXISTS idx_businesses_demo_seed ON public.businesses(demo_seed_batch) WHERE is_demo_seed = true;
CREATE INDEX IF NOT EXISTS idx_products_demo_seed ON public.products(demo_seed_batch) WHERE is_demo_seed = true;
CREATE INDEX IF NOT EXISTS idx_events_demo_seed ON public.events(demo_seed_batch) WHERE is_demo_seed = true;
CREATE INDEX IF NOT EXISTS idx_media_assets_demo_seed ON public.media_assets(demo_seed_batch) WHERE is_demo_seed = true;

-- Vista de inventario Demo Seed
CREATE OR REPLACE VIEW public.demo_seed_inventory AS
  SELECT 'destinations'::text AS entity, demo_seed_batch, COUNT(*)::bigint AS total
    FROM public.destinations WHERE is_demo_seed GROUP BY demo_seed_batch
  UNION ALL
  SELECT 'destination_zones', demo_seed_batch, COUNT(*)
    FROM public.destination_zones WHERE is_demo_seed GROUP BY demo_seed_batch
  UNION ALL
  SELECT 'points_of_interest', demo_seed_batch, COUNT(*)
    FROM public.points_of_interest WHERE is_demo_seed GROUP BY demo_seed_batch
  UNION ALL
  SELECT 'businesses', demo_seed_batch, COUNT(*)
    FROM public.businesses WHERE is_demo_seed GROUP BY demo_seed_batch
  UNION ALL
  SELECT 'products', demo_seed_batch, COUNT(*)
    FROM public.products WHERE is_demo_seed GROUP BY demo_seed_batch
  UNION ALL
  SELECT 'events', demo_seed_batch, COUNT(*)
    FROM public.events WHERE is_demo_seed GROUP BY demo_seed_batch
  UNION ALL
  SELECT 'media_assets', demo_seed_batch, COUNT(*)
    FROM public.media_assets WHERE is_demo_seed GROUP BY demo_seed_batch;

GRANT SELECT ON public.demo_seed_inventory TO authenticated;
GRANT ALL ON public.demo_seed_inventory TO service_role;

-- Función de purga segura (solo super_admin/admin), retira un batch completo
CREATE OR REPLACE FUNCTION public.purge_demo_seed(_batch TEXT)
RETURNS TABLE(entity TEXT, deleted BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  n BIGINT;
BEGIN
  SELECT public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    INTO is_admin;
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Forbidden: solo super_admin o admin pueden purgar Demo Seed';
  END IF;
  IF _batch IS NULL OR length(_batch) = 0 THEN
    RAISE EXCEPTION 'Se requiere demo_seed_batch';
  END IF;

  DELETE FROM public.media_assets WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'media_assets'; deleted := n; RETURN NEXT;

  DELETE FROM public.products WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'products'; deleted := n; RETURN NEXT;

  DELETE FROM public.events WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'events'; deleted := n; RETURN NEXT;

  DELETE FROM public.businesses WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'businesses'; deleted := n; RETURN NEXT;

  DELETE FROM public.points_of_interest WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'points_of_interest'; deleted := n; RETURN NEXT;

  DELETE FROM public.destination_zones WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'destination_zones'; deleted := n; RETURN NEXT;

  DELETE FROM public.destinations WHERE is_demo_seed AND demo_seed_batch = _batch;
  GET DIAGNOSTICS n = ROW_COUNT; entity := 'destinations'; deleted := n; RETURN NEXT;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_demo_seed(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_demo_seed(TEXT) TO authenticated;