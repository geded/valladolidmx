-- H3·A4 · M2.3.1 · Fase B v1.1 · Ajuste de frecuencia del scheduler
-- Cambia `* * * * *` -> `*/5 * * * *` conforme Blueprint aprobado.
DO $$
DECLARE _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'masu-renewal-scheduler';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
  PERFORM cron.schedule(
    'masu-renewal-scheduler',
    '*/5 * * * *',
    $cmd$SELECT public.masu_trigger_renewal();$cmd$
  );
END $$;