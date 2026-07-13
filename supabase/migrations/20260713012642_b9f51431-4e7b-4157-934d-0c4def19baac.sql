-- Sub-ola 4 · Demo Pack v1 · Alux Evaluations (Golden Set)
CREATE TABLE public.alux_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite text NOT NULL,
  question text NOT NULL,
  locale text NOT NULL DEFAULT 'es',
  expected_entities text[] NOT NULL DEFAULT ARRAY[]::text[],
  forbidden_terms text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_answer text,
  last_score numeric(4,3),
  last_hallucination_risk numeric(4,3),
  last_latency_ms integer,
  last_matched_entities text[] DEFAULT ARRAY[]::text[],
  last_missing_entities text[] DEFAULT ARRAY[]::text[],
  last_run_at timestamptz,
  last_ok boolean,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.alux_evaluations TO authenticated;
GRANT ALL ON public.alux_evaluations TO service_role;
ALTER TABLE public.alux_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read evaluations"
  ON public.alux_evaluations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_alux_evaluations_updated_at
  BEFORE UPDATE ON public.alux_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Golden Set semilla: recorrido Demo World Oriente Maya
INSERT INTO public.alux_evaluations (suite, question, locale, expected_entities, forbidden_terms) VALUES
 ('demo-oriente-maya','¿Dónde me puedo hospedar en Valladolid con un ambiente colonial?','es', ARRAY['Valladolid'], ARRAY['Cancún','Playa del Carmen']),
 ('demo-oriente-maya','Recomiéndame un restaurante para probar cochinita pibil auténtica','es', ARRAY['cochinita'], ARRAY['sushi','pizza']),
 ('demo-oriente-maya','¿Qué tour puedo hacer al amanecer en el Oriente Maya?','es', ARRAY['amanecer','manglar'], ARRAY[]::text[]),
 ('demo-oriente-maya','Quiero una casa de vacaciones en Izamal para 4 personas','es', ARRAY['Izamal'], ARRAY[]::text[]),
 ('demo-oriente-maya','¿Cuál es el estatus de mi orden VMX-DEMO01?','es', ARRAY['VMX-DEMO01'], ARRAY[]::text[]),
 ('demo-oriente-maya','¿Qué actividades hay cerca de Valladolid para hacer en un día?','es', ARRAY['Valladolid'], ARRAY[]::text[]),
 ('demo-oriente-maya','Soy vegetariano, ¿dónde puedo comer bien en Valladolid?','es', ARRAY['Valladolid'], ARRAY[]::text[]),
 ('demo-oriente-maya','Recomiéndame un pueblo mágico cerca de Valladolid','es', ARRAY['Izamal'], ARRAY[]::text[]),
 ('demo-oriente-maya','¿Qué necesito saber sobre seguridad para viajar en la región?','es', ARRAY['seguridad'], ARRAY[]::text[]),
 ('demo-oriente-maya','Where can I stay in Valladolid with a colonial vibe?','en', ARRAY['Valladolid'], ARRAY['Cancun','Tulum']);