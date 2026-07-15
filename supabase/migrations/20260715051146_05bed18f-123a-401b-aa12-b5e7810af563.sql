-- H3·A4 · M2.3.1 · Fase B · Ciclo E2E autorizado (Founder)
-- Ventana ≤15min. Sólo asset piloto 642cb15f-0a13-410c-8027-c4ab92034bf5.
-- Activación temporal del kill-switch. media_pipeline_enabled permanece false.
UPDATE public.platform_settings
SET value = 'true'::jsonb, updated_at = now()
WHERE key = 'media_persisted_signatures_enabled';