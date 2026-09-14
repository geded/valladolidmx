ALTER TABLE public.travel_plan_items
  ADD COLUMN IF NOT EXISTS starts_at_local time,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS schedule_source text;

ALTER TABLE public.travel_plan_items
  DROP CONSTRAINT IF EXISTS travel_plan_items_schedule_source_check;

ALTER TABLE public.travel_plan_items
  ADD CONSTRAINT travel_plan_items_schedule_source_check
  CHECK (schedule_source IS NULL OR schedule_source IN ('concierge','alux','traveler'));

ALTER TABLE public.travel_plan_items
  DROP CONSTRAINT IF EXISTS travel_plan_items_duration_minutes_check;

ALTER TABLE public.travel_plan_items
  ADD CONSTRAINT travel_plan_items_duration_minutes_check
  CHECK (duration_minutes IS NULL OR (duration_minutes > 0 AND duration_minutes <= 1440));

COMMENT ON COLUMN public.travel_plan_items.starts_at_local IS 'Hora local del destino (America/Merida) en que inicia la actividad. NULL = sin hora.';
COMMENT ON COLUMN public.travel_plan_items.duration_minutes IS 'Duracion estimada en minutos.';
COMMENT ON COLUMN public.travel_plan_items.schedule_source IS 'Origen del horario: concierge | alux (sugerido) | traveler (confirmado por el viajero).';