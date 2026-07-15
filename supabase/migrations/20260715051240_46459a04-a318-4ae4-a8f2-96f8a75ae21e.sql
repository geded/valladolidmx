-- H3·A4 · M2.3.1 · Fase B · Bootstrap del secreto Vault
-- Generado en runtime; nunca plaintext en repo/logs.
DO $$
DECLARE _v text;
BEGIN
  _v := encode(gen_random_bytes(32), 'hex'); -- 64 hex chars, ≥32 bytes
  PERFORM public.masu_bootstrap_secret(_v);
END
$$;