ALTER TABLE public.events
  ADD COLUMN recurrence_frequency text,
  ADD COLUMN recurrence_interval smallint NOT NULL DEFAULT 1,
  ADD COLUMN recurrence_weekdays smallint[] NOT NULL DEFAULT '{}'::smallint[],
  ADD COLUMN recurrence_until date,
  ADD COLUMN schedule_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN exception_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN event_timezone text NOT NULL DEFAULT 'America/Merida';

ALTER TABLE public.events
  ADD CONSTRAINT events_recurrence_frequency_check
    CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  ADD CONSTRAINT events_recurrence_interval_check
    CHECK (recurrence_interval BETWEEN 1 AND 99),
  ADD CONSTRAINT events_recurrence_weekdays_check
    CHECK (recurrence_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]),
  ADD CONSTRAINT events_schedule_times_array_check
    CHECK (jsonb_typeof(schedule_times) = 'array'),
  ADD CONSTRAINT events_exception_dates_array_check
    CHECK (jsonb_typeof(exception_dates) = 'array'),
  ADD CONSTRAINT events_timezone_check
    CHECK (event_timezone = 'America/Merida');

CREATE INDEX events_recurrence_public_idx
  ON public.events (status, recurrence_frequency, recurrence_until)
  WHERE deleted_at IS NULL;