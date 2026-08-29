CREATE TABLE public.traveler_memory_projection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  personalization TEXT NOT NULL DEFAULT 'active',
  anonymous_subject_hash TEXT UNIQUE,
  linked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT traveler_memory_projection_personalization_chk
    CHECK (personalization IN ('active','paused'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.traveler_memory_projection TO authenticated;
GRANT ALL ON public.traveler_memory_projection TO service_role;

ALTER TABLE public.traveler_memory_projection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traveler_memory_projection_own_select"
  ON public.traveler_memory_projection FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "traveler_memory_projection_own_insert"
  ON public.traveler_memory_projection FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "traveler_memory_projection_own_update"
  ON public.traveler_memory_projection FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "traveler_memory_projection_own_delete"
  ON public.traveler_memory_projection FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER traveler_memory_projection_touch
  BEFORE UPDATE ON public.traveler_memory_projection
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();