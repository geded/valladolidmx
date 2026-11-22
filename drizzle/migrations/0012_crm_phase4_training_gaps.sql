ALTER TYPE public.alux_knowledge_category ADD VALUE IF NOT EXISTS 'destinos';

CREATE TABLE public.alux_knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL CHECK (channel IN ('web','whatsapp','chat')),
  destination_slug text NULL CHECK (destination_slug IS NULL OR char_length(destination_slug) <= 128),
  question text NOT NULL CHECK (char_length(btrim(question)) BETWEEN 3 AND 300),
  question_key text NOT NULL CHECK (char_length(question_key) BETWEEN 3 AND 300),
  reason text NOT NULL DEFAULT 'sin_datos' CHECK (reason IN ('sin_datos','no_supo')),
  occurrences integer NOT NULL DEFAULT 1 CHECK (occurrences >= 1),
  status text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','resuelta','ignorada')),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  knowledge_entry_id uuid NULL REFERENCES public.alux_knowledge_entries(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX alux_knowledge_gaps_key_uidx ON public.alux_knowledge_gaps (question_key, coalesce(destination_slug, ''));
CREATE INDEX alux_knowledge_gaps_status_idx ON public.alux_knowledge_gaps (status, last_seen_at DESC);

GRANT SELECT ON public.alux_knowledge_gaps TO authenticated;
GRANT UPDATE (status, resolved_at, resolved_by, knowledge_entry_id) ON public.alux_knowledge_gaps TO authenticated;
GRANT ALL ON public.alux_knowledge_gaps TO service_role;
ALTER TABLE public.alux_knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY alux_knowledge_gaps_admin_read ON public.alux_knowledge_gaps
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY alux_knowledge_gaps_admin_update ON public.alux_knowledge_gaps
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Registro idempotente (solo servidor): misma pregunta + destino suma una vez más.
CREATE OR REPLACE FUNCTION public.alux_record_knowledge_gap(
  _channel text, _destination_slug text, _question text, _question_key text, _reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.alux_knowledge_gaps (channel, destination_slug, question, question_key, reason)
  VALUES (_channel, nullif(_destination_slug, ''), left(btrim(_question), 300), left(_question_key, 300), coalesce(_reason, 'sin_datos'))
  ON CONFLICT (question_key, coalesce(destination_slug, '')) DO UPDATE
    SET occurrences = public.alux_knowledge_gaps.occurrences + 1,
        last_seen_at = now(),
        status = CASE WHEN public.alux_knowledge_gaps.status = 'resuelta' THEN 'abierta' ELSE public.alux_knowledge_gaps.status END,
        resolved_at = CASE WHEN public.alux_knowledge_gaps.status = 'resuelta' THEN NULL ELSE public.alux_knowledge_gaps.resolved_at END
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.alux_record_knowledge_gap(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alux_record_knowledge_gap(text, text, text, text, text) TO service_role;