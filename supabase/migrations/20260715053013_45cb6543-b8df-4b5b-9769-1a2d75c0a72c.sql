-- H3·A4 · M2.3.1 · Fase B · Cierre de ventana E2E (fail-safe)
UPDATE public.platform_settings
SET value = 'false'::jsonb, updated_at = now()
WHERE key = 'media_persisted_signatures_enabled';