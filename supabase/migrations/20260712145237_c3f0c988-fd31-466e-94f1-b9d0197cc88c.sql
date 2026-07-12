-- Ola A17 · Memoria territorial unificada cross-device.
-- Vincula sesiones anónimas del concierge con el traveler autenticado
-- para consolidar historial entre dispositivos.

ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS traveler_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS alux_public_sessions_traveler_idx
  ON public.alux_public_sessions (traveler_user_id)
  WHERE traveler_user_id IS NOT NULL;