CREATE UNIQUE INDEX IF NOT EXISTS alux_public_messages_session_external_uidx
  ON public.alux_public_messages (session_id, external_id);
DROP INDEX IF EXISTS public.alux_public_messages_external_uidx;