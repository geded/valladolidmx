
CREATE TABLE public.founder_spotlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reason text NOT NULL,
  headline text,
  boost integer NOT NULL DEFAULT 1000,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_founder_spotlights_business ON public.founder_spotlights(business_id);
CREATE INDEX idx_founder_spotlights_active ON public.founder_spotlights(is_active, ends_at) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_spotlights TO authenticated;
GRANT ALL ON public.founder_spotlights TO service_role;
GRANT SELECT ON public.founder_spotlights TO anon;

ALTER TABLE public.founder_spotlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spotlights"
  ON public.founder_spotlights FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Public reads active spotlights"
  ON public.founder_spotlights FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE TRIGGER trg_founder_spotlights_updated_at
  BEFORE UPDATE ON public.founder_spotlights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.active_founder_spotlights
WITH (security_invoker = on) AS
  SELECT s.business_id, s.headline, s.boost, s.starts_at, s.ends_at
  FROM public.founder_spotlights s
  WHERE s.is_active = true AND s.starts_at <= now() AND s.ends_at > now();

GRANT SELECT ON public.active_founder_spotlights TO anon, authenticated;
