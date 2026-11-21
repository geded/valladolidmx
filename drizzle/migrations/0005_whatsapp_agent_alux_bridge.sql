CREATE TABLE public.whatsapp_agent_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  next_offset bigint,
  recipient_id text,
  lease_until timestamptz,
  setup_at timestamptz NOT NULL DEFAULT now(),
  last_poll_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_agent_state TO service_role;
ALTER TABLE public.whatsapp_agent_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.whatsapp_agent_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.whatsapp_agent_alux_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  destination_slug text,
  registered boolean NOT NULL DEFAULT false,
  user_agent text,
  sent_at timestamptz,
  skipped_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_agent_alux_notices_pending_idx
  ON public.whatsapp_agent_alux_notices (started_at) WHERE sent_at IS NULL AND skipped_reason IS NULL;
GRANT ALL ON public.whatsapp_agent_alux_notices TO service_role;
ALTER TABLE public.whatsapp_agent_alux_notices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.whatsapp_agent_inbound (
  message_id text PRIMARY KEY,
  sender text NOT NULL,
  message_type text NOT NULL,
  body text,
  sent_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  reply_status text NOT NULL DEFAULT 'pending'
    CHECK (reply_status IN ('pending','sending','sent','failed','ignored','unknown')),
  attempts integer NOT NULL DEFAULT 0,
  reply_message_id text,
  last_error text,
  processed_at timestamptz
);
CREATE INDEX whatsapp_agent_inbound_pending_idx
  ON public.whatsapp_agent_inbound (received_at) WHERE reply_status IN ('pending','failed','sending');
GRANT ALL ON public.whatsapp_agent_inbound TO service_role;
ALTER TABLE public.whatsapp_agent_inbound ENABLE ROW LEVEL SECURITY;

-- Aviso cuando una sesión de Alux envía su primer mensaje. Nunca rompe Alux.
CREATE OR REPLACE FUNCTION public.whatsapp_agent_enqueue_alux_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.message_count, 0) >= 1
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.message_count, 0) = 0) THEN
    BEGIN
      INSERT INTO public.whatsapp_agent_alux_notices
        (session_id, started_at, destination_slug, registered, user_agent)
      VALUES
        (NEW.id, now(), NEW.last_destination_slug, NEW.traveler_user_id IS NOT NULL, left(NEW.user_agent, 300))
      ON CONFLICT (session_id) DO NOTHING;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_agent_enqueue_alux_notice() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER whatsapp_agent_alux_notice
AFTER INSERT OR UPDATE OF message_count ON public.alux_public_sessions
FOR EACH ROW EXECUTE FUNCTION public.whatsapp_agent_enqueue_alux_notice();

-- Igual que cron_hooks_invoke, con espera ampliada para trabajos que conversan con IA.
CREATE OR REPLACE FUNCTION public.cron_hooks_invoke_long(_path text, _timeout_ms integer DEFAULT 55000)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base    constant text := 'https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app';
  _secret  text;
  _request bigint;
BEGIN
  IF _path IS NULL OR _path !~ '^/api/public/hooks/[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'invalid_path';
  END IF;
  _secret := public.cron_hooks_get_secret();
  SELECT net.http_post(
    url := _base || _path,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', _secret),
    body := '{}'::jsonb,
    timeout_milliseconds := GREATEST(5000, LEAST(COALESCE(_timeout_ms, 55000), 58000))
  ) INTO _request;
  RETURN _request;
END;
$$;
REVOKE ALL ON FUNCTION public.cron_hooks_invoke_long(text, integer) FROM PUBLIC, anon, authenticated;