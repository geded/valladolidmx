
-- H3·A4 · M2.3.1 · Fase B · Scheduler HMAC + Vault helpers (kill-switch aware)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) Vault helpers ---------------------------------------------------------

-- Bootstrap/rotación del secreto en Supabase Vault. El valor entra como
-- parámetro (nunca literal en SQL); Vault lo persiste cifrado en reposo.
CREATE OR REPLACE FUNCTION public.masu_bootstrap_secret(_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _value IS NULL OR length(_value) < 32 THEN
    RAISE EXCEPTION 'invalid_secret';
  END IF;
  SELECT id INTO _id FROM vault.secrets WHERE name = 'media_signature_renew_hmac' LIMIT 1;
  IF _id IS NOT NULL THEN
    PERFORM vault.update_secret(_id, _value);
    RETURN _id;
  END IF;
  RETURN vault.create_secret(_value, 'media_signature_renew_hmac', 'H3A4 M2.3.1 endpoint HMAC — do not expose');
END;
$$;
REVOKE ALL ON FUNCTION public.masu_bootstrap_secret(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.masu_bootstrap_secret(text) TO service_role;

-- Lector interno del secreto. NO se otorga EXECUTE a nadie externo.
-- El único invocador válido es `masu_trigger_renewal()` (misma cadena SECURITY DEFINER,
-- mismo owner) que jamás retorna el valor.
CREATE OR REPLACE FUNCTION public.masu_get_renew_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _secret text;
BEGIN
  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'media_signature_renew_hmac'
  LIMIT 1;
  IF _secret IS NULL OR length(_secret) < 32 THEN
    RAISE EXCEPTION 'secret_missing';
  END IF;
  RETURN _secret;
END;
$$;
REVOKE ALL ON FUNCTION public.masu_get_renew_secret() FROM PUBLIC, anon, authenticated, service_role;

-- 2) Purga de firmas obsoletas -------------------------------------------

CREATE OR REPLACE FUNCTION public.masu_purge_stale(_variant_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.media_asset_signed_urls WHERE variant_key = _variant_key;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
REVOKE ALL ON FUNCTION public.masu_purge_stale(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.masu_purge_stale(text) TO service_role;

-- 3) Scheduler trigger (kill-switch aware) --------------------------------
--    Llama al endpoint HMAC. Sólo cuando `media_persisted_signatures_enabled`=true.
--    Con el flag OFF: no lee Vault, no llama Storage, no llama endpoint, no escribe.

CREATE OR REPLACE FUNCTION public.masu_trigger_renewal()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled_raw jsonb;
  _enabled     boolean;
  _url         text;
  _method      text := 'POST';
  _path        text := '/api/public/hooks/media-signature-renew';
  _body        text := '{}';
  _timestamp   text;
  _nonce       text;
  _body_hash   text;
  _canonical   text;
  _signature   text;
  _secret      text;
BEGIN
  -- Kill switch
  SELECT value INTO _enabled_raw
  FROM public.platform_settings
  WHERE key = 'media_persisted_signatures_enabled';
  _enabled := COALESCE(
    CASE
      WHEN _enabled_raw IS NULL THEN NULL
      WHEN jsonb_typeof(_enabled_raw) = 'boolean' THEN _enabled_raw::text::boolean
      WHEN jsonb_typeof(_enabled_raw) = 'string'  THEN (_enabled_raw #>> '{}')::boolean
      ELSE false
    END, false
  );
  IF NOT _enabled THEN
    RETURN; -- kill switch OFF: cron corre pero es inofensivo
  END IF;

  -- Sólo aquí leemos Vault. Si falta, fail-closed vía excepción capturada arriba en cron.
  _secret    := public.masu_get_renew_secret();
  _timestamp := extract(epoch from now())::bigint::text;
  _nonce     := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  _body_hash := encode(digest(_body, 'sha256'), 'hex');
  _canonical := _method || E'\n' || _path || E'\n' || _timestamp || E'\n' || _nonce || E'\n' || _body_hash;
  _signature := encode(hmac(_canonical, _secret, 'sha256'), 'hex');

  -- Preview URL (stable dev host). Ninguna URL derivada llega al navegador.
  _url := 'https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9-dev.lovable.app/api/public/hooks/media-signature-renew';

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'x-vmx-signature',   _signature,
      'x-vmx-timestamp',   _timestamp,
      'x-vmx-nonce',       _nonce
    ),
    body    := _body::jsonb,
    timeout_milliseconds := 8000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.masu_trigger_renewal() FROM PUBLIC, anon, authenticated, service_role;
-- El owner (postgres) es quien la ejecuta desde cron. Nadie externo.

-- 4) Programación del cron (idempotente) ---------------------------------
DO $$
DECLARE _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'masu-renewal-scheduler';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
  PERFORM cron.schedule(
    'masu-renewal-scheduler',
    '* * * * *',
    $cmd$SELECT public.masu_trigger_renewal();$cmd$
  );
END $$;

COMMENT ON FUNCTION public.masu_trigger_renewal()  IS 'H3A4 M2.3.1 · Cron trigger — kill-switch aware. No devuelve nada. Nunca expone secreto.';
COMMENT ON FUNCTION public.masu_get_renew_secret() IS 'H3A4 M2.3.1 · Vault reader interno. Sin EXECUTE a service_role/anon/authenticated. Sólo owner en cadena SECURITY DEFINER.';
COMMENT ON FUNCTION public.masu_bootstrap_secret(text) IS 'H3A4 M2.3.1 · Bootstrap/rotación del secreto en Vault. Invocable únicamente desde server fn con rol super_admin.';
