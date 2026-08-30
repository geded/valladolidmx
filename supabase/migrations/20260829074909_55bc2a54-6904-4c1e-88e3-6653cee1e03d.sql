-- G8-R1-F1A · Cierre de exposición de secretos de webhook (aditiva, reversible, idempotente)

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.notification_webhook_secrets (
  endpoint_id uuid PRIMARY KEY REFERENCES public.notification_webhook_endpoints(id) ON DELETE CASCADE,
  secret_current text NOT NULL,
  secret_previous text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.notification_webhook_secrets FROM PUBLIC;
REVOKE ALL ON private.notification_webhook_secrets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.notification_webhook_secrets TO service_role;

ALTER TABLE private.notification_webhook_secrets ENABLE ROW LEVEL SECURITY;

-- Migración de valores existentes (idempotente; hoy 0 filas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_webhook_endpoints'
      AND column_name = 'secret_current'
  ) THEN
    EXECUTE $mig$
      INSERT INTO private.notification_webhook_secrets (endpoint_id, secret_current, secret_previous)
      SELECT id, secret_current, secret_previous
      FROM public.notification_webhook_endpoints
      WHERE secret_current IS NOT NULL
      ON CONFLICT (endpoint_id) DO NOTHING
    $mig$;
    EXECUTE 'ALTER TABLE public.notification_webhook_endpoints DROP COLUMN secret_current';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_webhook_endpoints'
      AND column_name = 'secret_previous'
  ) THEN
    EXECUTE 'ALTER TABLE public.notification_webhook_endpoints DROP COLUMN secret_previous';
  END IF;
END
$$;

-- Escritura/rotación por el dueño, sin lectura posible
CREATE OR REPLACE FUNCTION public.unc_webhook_secret_set(_endpoint_id uuid, _secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _owner uuid;
BEGIN
  IF _secret IS NULL OR length(_secret) < 16 THEN
    RAISE EXCEPTION 'unc_webhook_secret_set: secret inválido';
  END IF;

  SELECT owner_user_id INTO _owner
  FROM public.notification_webhook_endpoints
  WHERE id = _endpoint_id;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'unc_webhook_secret_set: endpoint inexistente';
  END IF;

  IF auth.uid() IS DISTINCT FROM _owner AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'unc_webhook_secret_set: no autorizado';
  END IF;

  INSERT INTO private.notification_webhook_secrets (endpoint_id, secret_current)
  VALUES (_endpoint_id, _secret)
  ON CONFLICT (endpoint_id) DO UPDATE
    SET secret_previous = private.notification_webhook_secrets.secret_current,
        secret_current = EXCLUDED.secret_current,
        updated_at = now();
END
$$;

REVOKE ALL ON FUNCTION public.unc_webhook_secret_set(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unc_webhook_secret_set(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.unc_webhook_secret_set(uuid, text) TO authenticated, service_role;

-- Lectura reservada a procesos internos del servidor
CREATE OR REPLACE FUNCTION private.unc_webhook_secret_get(_endpoint_id uuid)
RETURNS TABLE (secret_current text, secret_previous text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT s.secret_current, s.secret_previous
  FROM private.notification_webhook_secrets s
  WHERE s.endpoint_id = _endpoint_id
$$;

REVOKE ALL ON FUNCTION private.unc_webhook_secret_get(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.unc_webhook_secret_get(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION private.unc_webhook_secret_get(uuid) TO service_role;