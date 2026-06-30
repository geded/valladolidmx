
CREATE TYPE public.favorite_entity_kind AS ENUM ('business', 'product', 'promotion');

CREATE TABLE public.traveler_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_kind public.favorite_entity_kind NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT traveler_favorites_unique UNIQUE (user_id, entity_kind, entity_id)
);

CREATE INDEX idx_traveler_favorites_user_created
  ON public.traveler_favorites (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.traveler_favorites TO authenticated;
GRANT ALL ON public.traveler_favorites TO service_role;

ALTER TABLE public.traveler_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traveler_favorites_select_own"
  ON public.traveler_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "traveler_favorites_insert_own"
  ON public.traveler_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "traveler_favorites_delete_own"
  ON public.traveler_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
