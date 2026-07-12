
-- Ola A4 · Feedback Loop de Alux
CREATE TABLE public.alux_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  reason TEXT,
  suggestion_excerpt TEXT,
  suggestion_hash TEXT,
  knowledge_ids UUID[] DEFAULT ARRAY[]::UUID[],
  model TEXT,
  latency_ms INTEGER,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.alux_feedback TO authenticated;
GRANT ALL ON public.alux_feedback TO service_role;

ALTER TABLE public.alux_feedback ENABLE ROW LEVEL SECURITY;

-- El viajero sólo escribe su propio feedback
CREATE POLICY "traveler inserts own feedback"
  ON public.alux_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- El viajero puede leer su propio historial (para inyectarlo como M3)
CREATE POLICY "traveler reads own feedback"
  ON public.alux_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/super_admin leen todo para KPIs
CREATE POLICY "admins read all feedback"
  ON public.alux_feedback
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX idx_alux_feedback_user_created ON public.alux_feedback (user_id, created_at DESC);
CREATE INDEX idx_alux_feedback_capability ON public.alux_feedback (capability, rating);
CREATE INDEX idx_alux_feedback_created ON public.alux_feedback (created_at DESC);
