-- OMXDS V1 · I1 — frontera de activación. Aditivo, idempotente y OFF.
INSERT INTO public.platform_settings (key, value, is_public, description)
VALUES (
  'omxds_visual_foundations_v1_enabled',
  to_jsonb(false),
  true,
  'Activa exclusivamente los fundamentos visuales compartidos OMXDS V1 I1. Default y rollback: false.'
)
ON CONFLICT (key) DO NOTHING;
