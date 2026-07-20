
-- MCP M1.0 · Foundations: audit + rate limiting

-- 1) Auditoría de invocaciones MCP (sin PII ni tokens)
CREATE TABLE public.mcp_tool_invocations (
  invocation_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  client_id TEXT,
  user_id UUID,
  input_hash TEXT,
  locale TEXT,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  result_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mcp_tool_invocations_tool_created_idx
  ON public.mcp_tool_invocations (tool_name, created_at DESC);
CREATE INDEX mcp_tool_invocations_user_created_idx
  ON public.mcp_tool_invocations (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX mcp_tool_invocations_client_created_idx
  ON public.mcp_tool_invocations (client_id, created_at DESC) WHERE client_id IS NOT NULL;

GRANT ALL ON public.mcp_tool_invocations TO service_role;
-- Sin GRANTs a anon/authenticated: sólo lectura vía RPC admin.

ALTER TABLE public.mcp_tool_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_invocations_admin_read"
  ON public.mcp_tool_invocations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2) Rate limiting: buckets deslizantes por ventana
CREATE TABLE public.mcp_rate_buckets (
  id BIGSERIAL PRIMARY KEY,
  scope_key TEXT NOT NULL,          -- p.ej. "user:<uuid>", "client:<id>", "ip:<ip>"
  tool_name TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  window_seconds INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_key, tool_name, window_seconds, window_started_at)
);

CREATE INDEX mcp_rate_buckets_cleanup_idx
  ON public.mcp_rate_buckets (window_started_at);

GRANT ALL ON public.mcp_rate_buckets TO service_role;

ALTER TABLE public.mcp_rate_buckets ENABLE ROW LEVEL SECURITY;
-- Sin políticas: sólo se accede vía RPC SECURITY DEFINER.

-- 3) RPC canónico para registrar invocaciones (server-only vía service_role)
CREATE OR REPLACE FUNCTION public.mcp_log_invocation(
  p_tool_name TEXT,
  p_contract_version TEXT,
  p_client_id TEXT,
  p_user_id UUID,
  p_input_hash TEXT,
  p_locale TEXT,
  p_duration_ms INTEGER,
  p_success BOOLEAN,
  p_error_code TEXT,
  p_result_count INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.mcp_tool_invocations (
    tool_name, contract_version, client_id, user_id, input_hash,
    locale, duration_ms, success, error_code, result_count
  ) VALUES (
    p_tool_name, p_contract_version, p_client_id, p_user_id, p_input_hash,
    p_locale, p_duration_ms, p_success, p_error_code, p_result_count
  )
  RETURNING invocation_id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_log_invocation(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, BOOLEAN, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_log_invocation(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, BOOLEAN, TEXT, INTEGER
) TO service_role;

-- 4) RPC atómico de rate limit (UPSERT contador por ventana)
CREATE OR REPLACE FUNCTION public.mcp_rate_hit(
  p_scope_key TEXT,
  p_tool_name TEXT,
  p_window_seconds INTEGER,
  p_limit INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Alinea inicio de ventana al múltiplo de window_seconds desde epoch
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.mcp_rate_buckets (
    scope_key, tool_name, window_started_at, window_seconds, count
  ) VALUES (
    p_scope_key, p_tool_name, v_window_start, p_window_seconds, 1
  )
  ON CONFLICT (scope_key, tool_name, window_seconds, window_started_at)
  DO UPDATE SET count = public.mcp_rate_buckets.count + 1, updated_at = now()
  RETURNING public.mcp_rate_buckets.count INTO v_count;

  IF v_count > p_limit THEN
    RETURN QUERY SELECT
      false,
      v_count,
      GREATEST(1, p_window_seconds - CAST(extract(epoch FROM (now() - v_window_start)) AS INTEGER));
  ELSE
    RETURN QUERY SELECT true, v_count, 0;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_rate_hit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_rate_hit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
