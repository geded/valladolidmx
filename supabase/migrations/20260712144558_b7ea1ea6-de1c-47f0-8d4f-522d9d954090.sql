
ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS visited_destinations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visited_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destination_visit_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.alux_public_sessions.visited_destinations IS 'A16: array of {slug,label,first_seen,last_seen,count} — memoria territorial persistente por sesión.';
COMMENT ON COLUMN public.alux_public_sessions.visited_categories IS 'A16: array de {slug,count,last_seen} — patrones de exploración por categoría.';
