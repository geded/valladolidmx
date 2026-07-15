
-- H3·A4 · M2.3.1 · Persisted Signature Precomputation — Migración aditiva (Fase A)
-- Blueprint v1.2 aprobado. Kill switch OFF por defecto. Sin destrucción.

-- 1) Kill switch operativo (idempotente).
INSERT INTO public.platform_settings (key, value)
VALUES ('media_persisted_signatures_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) Tabla server-only: firmas persistidas.
CREATE TABLE IF NOT EXISTS public.media_asset_signed_urls (
  variant_key        text        PRIMARY KEY,
  asset_id           uuid        NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  variant_id         uuid        NOT NULL REFERENCES public.media_asset_variants(id) ON DELETE CASCADE,
  bucket             text        NOT NULL,
  path               text        NOT NULL,
  signed_url         text        NOT NULL,
  issued_at          timestamptz NOT NULL,
  expires_at         timestamptz NOT NULL,
  refresh_after      timestamptz NOT NULL,
  servable_until     timestamptz NOT NULL, -- expires_at - 6h (margen servible unificado)
  state              text        NOT NULL DEFAULT 'ready',
  attempt_count      integer     NOT NULL DEFAULT 0,
  next_retry_at      timestamptz,
  last_error         text,
  locked_at          timestamptz,
  locked_by          text,
  worker_generation  bigint      NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT masu_state_check CHECK (state = ANY (ARRAY['ready','refreshing','failed_retrying','alert_10','alert_20'])),
  CONSTRAINT masu_bucket_check CHECK (bucket IN ('media-derived')),
  CONSTRAINT masu_signed_url_shape CHECK (length(signed_url) BETWEEN 10 AND 4096),
  CONSTRAINT masu_expires_after_issued CHECK (expires_at > issued_at),
  CONSTRAINT masu_refresh_before_expires CHECK (refresh_after < expires_at),
  CONSTRAINT masu_servable_before_expires CHECK (servable_until <= expires_at),
  CONSTRAINT masu_attempt_nonnegative CHECK (attempt_count >= 0)
);

-- Índices operativos para el scheduler.
CREATE INDEX IF NOT EXISTS idx_masu_refresh_after
  ON public.media_asset_signed_urls (refresh_after)
  WHERE state IN ('ready','failed_retrying');
CREATE INDEX IF NOT EXISTS idx_masu_next_retry
  ON public.media_asset_signed_urls (next_retry_at)
  WHERE state IN ('failed_retrying','alert_10','alert_20');
CREATE INDEX IF NOT EXISTS idx_masu_locked
  ON public.media_asset_signed_urls (locked_at)
  WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_masu_asset
  ON public.media_asset_signed_urls (asset_id);

-- 3) Tabla anti-replay: nonces durables del endpoint HMAC.
CREATE TABLE IF NOT EXISTS public.media_signature_renew_nonces (
  nonce       text        PRIMARY KEY,
  issued_at   timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_by     text,
  CONSTRAINT masr_expires_after_issued CHECK (expires_at > issued_at)
);
CREATE INDEX IF NOT EXISTS idx_masr_expires ON public.media_signature_renew_nonces (expires_at);

-- 4) Trigger updated_at.
DROP TRIGGER IF EXISTS trg_masu_updated_at ON public.media_asset_signed_urls;
CREATE TRIGGER trg_masu_updated_at
  BEFORE UPDATE ON public.media_asset_signed_urls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) GRANTs mínimos + REVOKE explícito (server-only, cero acceso público).
REVOKE ALL ON public.media_asset_signed_urls FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.media_signature_renew_nonces FROM PUBLIC, anon, authenticated;
GRANT  ALL ON public.media_asset_signed_urls        TO service_role;
GRANT  ALL ON public.media_signature_renew_nonces   TO service_role;

-- 6) RLS: enable + deny-all para anon/authenticated (service_role bypasa RLS por diseño).
ALTER TABLE public.media_asset_signed_urls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_signature_renew_nonces   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny all masu"  ON public.media_asset_signed_urls;
DROP POLICY IF EXISTS "deny all masr"  ON public.media_signature_renew_nonces;
CREATE POLICY "deny all masu" ON public.media_asset_signed_urls        FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny all masr" ON public.media_signature_renew_nonces   FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- 7) SELECT atómico del scheduler: `FOR UPDATE SKIP LOCKED` con adquisición de lock.
--    Devuelve variantes candidatas a renovación, marca lock y bumpa attempt_count.
CREATE OR REPLACE FUNCTION public.masu_claim_renewal_batch(
  _worker_id  text,
  _batch_size integer DEFAULT 10,
  _lock_ttl   interval DEFAULT interval '5 minutes'
)
RETURNS TABLE (
  variant_key   text,
  asset_id      uuid,
  variant_id    uuid,
  bucket        text,
  path          text,
  attempt_count integer,
  state         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT s.variant_key
    FROM public.media_asset_signed_urls s
    WHERE (
        -- Nunca renovado (state='ready' con refresh_after vencido)
        (s.state = 'ready' AND s.refresh_after <= now())
        -- Reintento programado
        OR (s.state IN ('failed_retrying','alert_10','alert_20')
            AND s.next_retry_at IS NOT NULL
            AND s.next_retry_at <= now())
      )
      -- Recuperación de locks huérfanos
      AND (s.locked_at IS NULL OR s.locked_at < now() - _lock_ttl)
    ORDER BY LEAST(
        COALESCE(s.refresh_after, now()),
        COALESCE(s.next_retry_at, now())
      ) ASC
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.media_asset_signed_urls s
  SET state         = 'refreshing',
      locked_at     = now(),
      locked_by     = _worker_id,
      attempt_count = s.attempt_count + 1
  FROM candidates c
  WHERE s.variant_key = c.variant_key
  RETURNING s.variant_key, s.asset_id, s.variant_id, s.bucket, s.path,
           s.attempt_count, s.state;
END;
$$;
REVOKE ALL ON FUNCTION public.masu_claim_renewal_batch(text, integer, interval) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.masu_claim_renewal_batch(text, integer, interval) TO service_role;

-- 8) UPSERT monotónico: sólo persiste si issued_at es más nuevo (protege contra resultados tardíos).
CREATE OR REPLACE FUNCTION public.masu_upsert_monotonic(
  _variant_key    text,
  _asset_id       uuid,
  _variant_id     uuid,
  _bucket         text,
  _path           text,
  _signed_url     text,
  _issued_at      timestamptz,
  _expires_at     timestamptz,
  _refresh_after  timestamptz,
  _servable_until timestamptz,
  _worker_id      text
)
RETURNS TABLE (applied boolean, existing_issued_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_issued_at timestamptz;
BEGIN
  SELECT issued_at INTO _existing_issued_at
  FROM public.media_asset_signed_urls WHERE variant_key = _variant_key
  FOR UPDATE;

  IF _existing_issued_at IS NOT NULL AND _existing_issued_at >= _issued_at THEN
    -- Resultado tardío: descartar. Liberar lock.
    UPDATE public.media_asset_signed_urls
    SET locked_at = NULL, locked_by = NULL
    WHERE variant_key = _variant_key AND locked_by = _worker_id;
    RETURN QUERY SELECT false, _existing_issued_at;
    RETURN;
  END IF;

  INSERT INTO public.media_asset_signed_urls
    (variant_key, asset_id, variant_id, bucket, path, signed_url,
     issued_at, expires_at, refresh_after, servable_until,
     state, attempt_count, next_retry_at, last_error, locked_at, locked_by)
  VALUES
    (_variant_key, _asset_id, _variant_id, _bucket, _path, _signed_url,
     _issued_at, _expires_at, _refresh_after, _servable_until,
     'ready', 0, NULL, NULL, NULL, NULL)
  ON CONFLICT (variant_key) DO UPDATE
  SET signed_url    = EXCLUDED.signed_url,
      bucket        = EXCLUDED.bucket,
      path          = EXCLUDED.path,
      issued_at     = EXCLUDED.issued_at,
      expires_at    = EXCLUDED.expires_at,
      refresh_after = EXCLUDED.refresh_after,
      servable_until= EXCLUDED.servable_until,
      state         = 'ready',
      attempt_count = 0,
      next_retry_at = NULL,
      last_error    = NULL,
      locked_at     = NULL,
      locked_by     = NULL;

  RETURN QUERY SELECT true, _issued_at;
END;
$$;
REVOKE ALL ON FUNCTION public.masu_upsert_monotonic(text,uuid,uuid,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.masu_upsert_monotonic(text,uuid,uuid,text,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text) TO service_role;

-- 9) Registrar fallo con backoff exponencial + escalado de alertas.
CREATE OR REPLACE FUNCTION public.masu_record_failure(
  _variant_key text,
  _error       text,
  _worker_id   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempts integer;
  _new_state text;
  _backoff  interval;
BEGIN
  SELECT attempt_count INTO _attempts
  FROM public.media_asset_signed_urls WHERE variant_key = _variant_key FOR UPDATE;

  IF _attempts IS NULL THEN RETURN; END IF;

  -- Backoff exponencial saturado a 1 hora.
  _backoff := LEAST(interval '30 seconds' * power(2, LEAST(_attempts, 7)), interval '1 hour');

  -- Escalado de alertas — reintento perpetuo, nunca abandona.
  IF _attempts >= 20 THEN
    _new_state := 'alert_20';
  ELSIF _attempts >= 10 THEN
    _new_state := 'alert_10';
  ELSE
    _new_state := 'failed_retrying';
  END IF;

  UPDATE public.media_asset_signed_urls
  SET state         = _new_state,
      last_error    = left(_error, 500),
      next_retry_at = now() + _backoff,
      locked_at     = NULL,
      locked_by     = NULL
  WHERE variant_key = _variant_key;
END;
$$;
REVOKE ALL ON FUNCTION public.masu_record_failure(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.masu_record_failure(text,text,text) TO service_role;

-- 10) Anti-replay: consumir nonce (fail-closed si ya fue usado o expiró).
CREATE OR REPLACE FUNCTION public.masr_consume_nonce(
  _nonce      text,
  _ttl        interval DEFAULT interval '5 minutes',
  _used_by    text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted integer;
BEGIN
  -- Limpieza oportunista de nonces expirados (barata, sólo si hay contención).
  DELETE FROM public.media_signature_renew_nonces WHERE expires_at < now();

  INSERT INTO public.media_signature_renew_nonces (nonce, expires_at, used_by)
  VALUES (_nonce, now() + _ttl, _used_by)
  ON CONFLICT (nonce) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.masr_consume_nonce(text,interval,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.masr_consume_nonce(text,interval,text) TO service_role;

COMMENT ON TABLE public.media_asset_signed_urls IS
  'H3·A4 M2.3.1 · Firmas persistidas server-only. Kill switch: platform_settings.media_persisted_signatures_enabled. DENY-ALL a anon/authenticated. Sólo service_role. Nunca expuesta al cliente.';
COMMENT ON TABLE public.media_signature_renew_nonces IS
  'H3·A4 M2.3.1 · Nonces anti-replay del endpoint interno HMAC. Server-only. TTL 5min por defecto.';
