-- Lote 3M-A · Endurecimiento de autorización cron · Parte 2: reapuntar jobs
-- Sólo cambia la orden SQL de los tres jobs existentes (mismo jobid, horario,
-- base de datos y usuario). Idempotente: se localizan por nombre.
DO $$
DECLARE
  _targets constant jsonb := '{
    "trip-journey-emails-hourly":     "/api/public/hooks/trip-journey-emails",
    "visibility-notifications-daily": "/api/public/hooks/visibility-notifications",
    "coupon-review-reminders-hourly": "/api/public/hooks/coupon-review-reminders"
  }'::jsonb;
  _name  text;
  _path  text;
  _jobid bigint;
BEGIN
  FOR _name, _path IN SELECT key, value #>> '{}' FROM jsonb_each(_targets) LOOP
    SELECT jobid INTO _jobid FROM cron.job WHERE jobname = _name;
    IF _jobid IS NULL THEN
      RAISE NOTICE 'Lote 3M-A: cron job % no existe; se omite', _name;
      CONTINUE;
    END IF;
    PERFORM cron.alter_job(
      job_id  := _jobid,
      command := format('SELECT public.cron_hooks_invoke(%L, true);', _path)
    );
  END LOOP;
END $$;