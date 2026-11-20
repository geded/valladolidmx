ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_place_matched_at timestamptz;

COMMENT ON COLUMN public.events.google_place_id IS 'Identificador de Google Maps de la sede del evento cuando no pertenece a un negocio; Alux lo usa para el resumen oficial de reseñas de la sede.';
COMMENT ON COLUMN public.events.google_place_matched_at IS 'Última vez que se intentó vincular la sede del evento con Google Maps; evita búsquedas repetidas.';