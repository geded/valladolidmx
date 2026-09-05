-- Lote 3M-A · Endurecimiento de autorización cron · Parte 1: Vault + invocador
-- Aditiva y reversible. No altera datos ni programaciones existentes.

CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) Bootstrap/rotación del secreto exclusivo de los ganchos cron en Vault.
--    El valor entra como parámetro (jamás literal en SQL) y nunca se devuelve:
--    sólo el id de Vault, la longitud y una verificación de ida y vuelta.
CREATE OR REPLACE FUNCTION public.cron_hooks_bootstrap_secret(_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _id uuid;
  _readback text;
BEGIN
  IF _value IS NULL OR length(_value) < 32 THEN
    RAISE EXCEPTION 'invalid_secret';
  END IF;
  SELECT id INTO _id FROM vault.secrets WHERE name = 'cron_hooks_secret' LIMIT 1;
  IF _id IS NOT NULL THEN
    PERFORM vault.update_secret(_id, _value);
  ELSE
    _id := vault.create_secret(
      _value,
      'cron_hooks_secret',
      'Lote 3M-A · secreto exclusivo de los ganchos cron (cabecera x-cron-secret) — no exponer'
    );
  END IF;
  SELECT decrypted_secret INTO _readback FROM vault.decrypted_secrets WHERE id = _id;
  RETURN jsonb_build_object(
    'secret_id', _id,
    'verified', _readback IS NOT DISTINCT FROM _value,
    'length', length(_value)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.cron_hooks_bootstrap_secret(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_hooks_bootstrap_secret(text) TO service_role;

-- 2) Lector interno. Sin EXECUTE para ningún rol externo: sólo la cadena
--    SECURITY DEFINER del mismo owner (cron_hooks_invoke) puede usarlo.
CREATE OR REPLACE FUNCTION public.cron_hooks_get_secret()
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
  WHERE name = 'cron_hooks_secret'
  LIMIT 1;
  IF _secret IS NULL OR length(_secret) < 32 THEN
    RAISE EXCEPTION 'secret_missing';
  END IF;
  RETURN _secret;
END;
$$;
REVOKE ALL ON FUNCTION public.cron_hooks_get_secret() FROM PUBLIC, anon, authenticated, service_role;

-- 3) Invocador de ganchos cron. Fail closed: sin secreto en Vault no se emite
--    ninguna petición. La URL funcional es la misma que usaban los jobs.
--    `_include_legacy_apikey` es una bandera de transición: mientras el código
--    endurecido no esté publicado, el despliegue vigente sólo reconoce la clave
--    pública; el código endurecido la ignora por completo. Se retira tras publicar.
CREATE OR REPLACE FUNCTION public.cron_hooks_invoke(
  _path text,
  _include_legacy_apikey boolean DEFAULT false
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base    constant text := 'https://project--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app';
  _legacy  constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbGZ3c3Fzcnppa2ppbGljb2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTEzMzcsImV4cCI6MjA5ODI2NzMzN30.41MUXgf32RTv5h4TucGMvlTAn0dwKg47qBVC_VurvRg';
  _secret  text;
  _headers jsonb;
  _request bigint;
BEGIN
  IF _path IS NULL OR _path !~ '^/api/public/hooks/[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'invalid_path';
  END IF;

  -- Fail closed: si Vault no tiene el secreto, la excepción detiene el job
  -- antes de emitir cualquier petición.
  _secret := public.cron_hooks_get_secret();

  _headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', _secret
  );
  IF _include_legacy_apikey THEN
    _headers := _headers || jsonb_build_object('apikey', _legacy);
  END IF;

  SELECT net.http_post(
    url     := _base || _path,
    headers := _headers,
    body    := '{}'::jsonb
  ) INTO _request;

  RETURN _request;
END;
$$;
REVOKE ALL ON FUNCTION public.cron_hooks_invoke(text, boolean) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.cron_hooks_bootstrap_secret(text) IS 'Lote 3M-A · Bootstrap/rotación del secreto exclusivo de los ganchos cron en Vault. Sólo service_role. Nunca devuelve el valor.';
COMMENT ON FUNCTION public.cron_hooks_get_secret() IS 'Lote 3M-A · Lector interno de Vault. Sin EXECUTE externo. Sólo cadena SECURITY DEFINER del owner.';
COMMENT ON FUNCTION public.cron_hooks_invoke(text, boolean) IS 'Lote 3M-A · Invoca un gancho cron con la cabecera privada x-cron-secret leída de Vault. Fail closed. Nunca expone el secreto.';