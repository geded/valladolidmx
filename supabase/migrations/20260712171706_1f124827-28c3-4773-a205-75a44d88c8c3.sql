-- CV2.2 · Bridge Alux → Travel Plan
-- Cola oficial de propuestas de Alux (concierge IA) al plan del viajero.
-- Alineado con Travel Plan Contract v1.0: Alux propone, el viajero confirma.

CREATE TABLE public.alux_plan_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.travel_plans(id) ON DELETE SET NULL,

  -- Entidad propuesta
  entity_type text NOT NULL CHECK (entity_type IN ('business','product','event','destination')),
  entity_id uuid,                        -- puede ser null si Alux propone algo sin id (raro; queda opcional)
  entity_slug text,
  title text NOT NULL,
  subtitle text,
  image_url text,

  -- Explicabilidad (Explainable by Default policy)
  rationale text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_session_id text,                -- Alux public session key o similar

  -- Ciclo de vida
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','dismissed','expired')),
  decided_at timestamptz,
  decision_note text,
  created_plan_item_id uuid REFERENCES public.travel_plan_items(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.alux_plan_proposals TO authenticated;
GRANT ALL ON public.alux_plan_proposals TO service_role;

ALTER TABLE public.alux_plan_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alux_plan_proposals owner select"
  ON public.alux_plan_proposals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "alux_plan_proposals owner insert"
  ON public.alux_plan_proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alux_plan_proposals owner update"
  ON public.alux_plan_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX alux_plan_proposals_user_status_idx
  ON public.alux_plan_proposals(user_id, status, created_at DESC);

CREATE INDEX alux_plan_proposals_plan_idx
  ON public.alux_plan_proposals(plan_id, created_at DESC);

-- Trigger de updated_at (reutiliza helper existente si está disponible)
CREATE OR REPLACE FUNCTION public.tg_alux_plan_proposals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER alux_plan_proposals_touch_updated_at
BEFORE UPDATE ON public.alux_plan_proposals
FOR EACH ROW EXECUTE FUNCTION public.tg_alux_plan_proposals_updated_at();