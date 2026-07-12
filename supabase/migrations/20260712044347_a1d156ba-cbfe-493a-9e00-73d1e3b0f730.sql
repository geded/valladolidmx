-- Ola A3 · Alux Público (prospectos anónimos con rate-limit + logging)

-- Sesiones anónimas: id generado por el cliente, sin PII
CREATE TABLE public.alux_public_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE, -- id opaco generado en el navegador
  ip_hash TEXT NOT NULL, -- sha256(ip + salt) - nunca IP en claro
  user_agent TEXT,
  message_count INT NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX alux_public_sessions_ip_hash_idx ON public.alux_public_sessions(ip_hash, last_seen_at DESC);

-- Log de mensajes (para métricas + revisión editorial)
CREATE TABLE public.alux_public_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.alux_public_sessions(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  knowledge_ids UUID[] NOT NULL DEFAULT '{}',
  latency_ms INT,
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX alux_public_messages_session_idx ON public.alux_public_messages(session_id, created_at);
CREATE INDEX alux_public_messages_ip_idx ON public.alux_public_messages(ip_hash, created_at DESC);

GRANT ALL ON public.alux_public_sessions TO service_role;
GRANT ALL ON public.alux_public_messages TO service_role;
-- No anon/authenticated grants: acceso sólo via server route con service role.

ALTER TABLE public.alux_public_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alux_public_messages ENABLE ROW LEVEL SECURITY;

-- Admins pueden leer todo para métricas/curación
CREATE POLICY "admin_read_public_sessions"
  ON public.alux_public_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_read_public_messages"
  ON public.alux_public_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- RPC de rate-limit atómico: cuenta mensajes de user en la ventana y decide
CREATE OR REPLACE FUNCTION public.alux_public_check_rate(
  _ip_hash TEXT,
  _hour_limit INT DEFAULT 10,
  _day_limit INT DEFAULT 40
)
RETURNS TABLE(hour_count INT, day_count INT, allowed BOOLEAN, hour_limit INT, day_limit INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h INT;
  d INT;
BEGIN
  SELECT COUNT(*) INTO h FROM public.alux_public_messages
    WHERE ip_hash = _ip_hash AND role = 'user' AND created_at > now() - INTERVAL '1 hour';
  SELECT COUNT(*) INTO d FROM public.alux_public_messages
    WHERE ip_hash = _ip_hash AND role = 'user' AND created_at > now() - INTERVAL '1 day';
  hour_count := h;
  day_count := d;
  hour_limit := _hour_limit;
  day_limit := _day_limit;
  allowed := (h < _hour_limit) AND (d < _day_limit);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.alux_public_check_rate(TEXT, INT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.alux_public_check_rate(TEXT, INT, INT) TO service_role;