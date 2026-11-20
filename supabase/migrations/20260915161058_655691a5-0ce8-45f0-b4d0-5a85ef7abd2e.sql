CREATE OR REPLACE FUNCTION public.masu_renew_secret_fingerprint()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT encode(digest(decrypted_secret, 'sha256'), 'hex')
  FROM vault.decrypted_secrets
  WHERE name = 'media_signature_renew_hmac'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.masu_renew_secret_fingerprint() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.masu_renew_secret_fingerprint() TO service_role;

COMMENT ON FUNCTION public.masu_renew_secret_fingerprint() IS
  'H3A4 M2.3.1 · Devuelve sólo SHA-256 del secreto Vault para diagnóstico server-side; nunca el valor.';