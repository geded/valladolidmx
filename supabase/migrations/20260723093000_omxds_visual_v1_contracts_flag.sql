-- OMXDS V1 · I2-A — contratos de tarjetas. Aditivo, idempotente y OFF.
INSERT INTO public.platform_settings (key, value, is_public, description)
VALUES (
  'omxds_visual_v1_contracts_enabled',
  to_jsonb(false),
  true,
  'Activa exclusivamente contratos de tarjetas OMXDS V1 en entornos autorizados. Default y rollback: false.'
)
ON CONFLICT (key) DO NOTHING;
