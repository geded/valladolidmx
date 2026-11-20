ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

COMMENT ON COLUMN public.events.latitude IS 'Latitud de la sede del evento (captura en CMS con mapa).';
COMMENT ON COLUMN public.events.longitude IS 'Longitud de la sede del evento (captura en CMS con mapa).';