UPDATE public.platform_settings
SET value = to_jsonb(false)
WHERE key = 'omxds_visual_v1_contracts_enabled'
  AND value IS DISTINCT FROM to_jsonb(false);