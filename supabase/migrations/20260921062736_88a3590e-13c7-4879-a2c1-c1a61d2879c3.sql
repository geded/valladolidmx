-- lovable-cron-fallback-reviewed: se retira el job de correo a petición del Founder
DO $$
DECLARE _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'unc-email-dispatch-5min';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
END $$;