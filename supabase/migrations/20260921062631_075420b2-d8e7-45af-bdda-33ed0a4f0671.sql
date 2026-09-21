-- lovable-cron-fallback-reviewed: avisos de aprobación deben llegar por correo casi al momento; no existe webhook de salida para el Delivery Ledger
DO $$
DECLARE _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'unc-email-dispatch-5min';
  IF _jobid IS NULL THEN
    PERFORM cron.schedule(
      'unc-email-dispatch-5min',
      '*/5 * * * *',
      $cmd$SELECT public.cron_hooks_invoke('/api/public/hooks/unc-email-dispatch', true);$cmd$
    );
  ELSE
    PERFORM cron.alter_job(
      job_id := _jobid,
      schedule := '*/5 * * * *',
      command := $cmd$SELECT public.cron_hooks_invoke('/api/public/hooks/unc-email-dispatch', true);$cmd$
    );
  END IF;
END $$;