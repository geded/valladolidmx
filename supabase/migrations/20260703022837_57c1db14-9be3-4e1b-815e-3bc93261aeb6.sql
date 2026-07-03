
-- US-02 Workflow states for Experience Builder
ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS workflow_state text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS workflow_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS workflow_updated_by uuid,
  ADD COLUMN IF NOT EXISTS workflow_notes text;

DO $$ BEGIN
  ALTER TABLE public.page_compositions
    ADD CONSTRAINT page_compositions_workflow_state_chk
    CHECK (workflow_state IN ('draft','in_review','approved'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.eb_set_workflow_state(
  _composition_id uuid,
  _next_state text,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _current text;
  _is_admin boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501';
  END IF;

  IF _next_state NOT IN ('draft','in_review','approved') THEN
    RAISE EXCEPTION 'invalid_state:%', _next_state USING ERRCODE='22023';
  END IF;

  SELECT workflow_state INTO _current
  FROM public.page_compositions WHERE id = _composition_id
  FOR UPDATE;

  IF _current IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE='P0002';
  END IF;

  _is_admin := public.has_role(_uid, 'super_admin')
            OR public.has_role(_uid, 'admin');

  -- Autorización: aprobar sólo admin; enviar a revisión / regresar a draft cualquier editor autenticado
  IF _next_state = 'approved' AND NOT _is_admin THEN
    RAISE EXCEPTION 'forbidden_approve' USING ERRCODE='42501';
  END IF;

  -- Transiciones válidas
  IF _current = _next_state THEN
    RETURN jsonb_build_object('workflow_state', _current, 'changed', false);
  END IF;

  UPDATE public.page_compositions
     SET workflow_state = _next_state,
         workflow_updated_at = now(),
         workflow_updated_by = _uid,
         workflow_notes = _notes,
         updated_at = now()
   WHERE id = _composition_id;

  RETURN jsonb_build_object('workflow_state', _next_state, 'changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.eb_set_workflow_state(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_set_workflow_state(uuid, text, text) TO authenticated;

-- Al publicar, resetear workflow a draft (nuevo ciclo editorial)
CREATE OR REPLACE FUNCTION public.eb_reset_workflow_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published_at IS DISTINCT FROM OLD.published_at AND NEW.published_at IS NOT NULL THEN
    NEW.workflow_state := 'draft';
    NEW.workflow_updated_at := now();
    NEW.workflow_notes := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_reset_workflow_on_publish ON public.page_compositions;
CREATE TRIGGER trg_eb_reset_workflow_on_publish
BEFORE UPDATE ON public.page_compositions
FOR EACH ROW EXECUTE FUNCTION public.eb_reset_workflow_on_publish();
