
ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS last_destination_slug text,
  ADD COLUMN IF NOT EXISTS last_category_slug text,
  ADD COLUMN IF NOT EXISTS last_spatial_state text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lng double precision,
  ADD COLUMN IF NOT EXISTS last_signals jsonb DEFAULT '[]'::jsonb;
