
CREATE TABLE public.travel_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.travel_plans(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.concierge_orders(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.travel_plan_items(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT NOT NULL,
  photo_url TEXT,
  rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX travel_memories_user_created_idx ON public.travel_memories(user_id, created_at DESC);
CREATE INDEX travel_memories_plan_idx ON public.travel_memories(plan_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_memories TO authenticated;
GRANT ALL ON public.travel_memories TO service_role;

ALTER TABLE public.travel_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own memories"
  ON public.travel_memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER travel_memories_updated_at
  BEFORE UPDATE ON public.travel_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
