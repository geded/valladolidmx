ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_place_matched_at timestamptz;

ALTER TABLE public.points_of_interest
  ADD COLUMN IF NOT EXISTS google_place_matched_at timestamptz;

COMMENT ON COLUMN public.businesses.google_place_id IS 'Identificador de Google Maps del negocio (único dato de Google que puede conservarse). Lo usa Alux para mostrar el resumen oficial de reseñas.';
COMMENT ON COLUMN public.businesses.google_place_matched_at IS 'Última vez que se intentó vincular el negocio con Google Maps; evita búsquedas repetidas.';
COMMENT ON COLUMN public.points_of_interest.google_place_matched_at IS 'Última vez que se intentó vincular el lugar con Google Maps; evita búsquedas repetidas.';