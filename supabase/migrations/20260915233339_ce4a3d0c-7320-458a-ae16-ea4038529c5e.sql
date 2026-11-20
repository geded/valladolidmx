-- Permisos de acceso que faltaban por completo en la tabla de notas del expediente
GRANT SELECT, INSERT ON public.concierge_case_notes TO authenticated;
GRANT ALL ON public.concierge_case_notes TO service_role;

-- El viajero puede leer los mensajes dirigidos a él (política ya existente: ccn_select_traveler)
-- y ahora también escribir en sus propios expedientes.
CREATE POLICY ccn_insert_traveler
ON public.concierge_case_notes
FOR INSERT
TO authenticated
WITH CHECK (
  visibility = 'traveler'
  AND author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.concierge_cases c
    WHERE c.id = concierge_case_notes.case_id
      AND c.traveler_user_id = auth.uid()
  )
);

-- El equipo interno escribe mensajes al viajero y notas internas en los expedientes que puede ver.
CREATE POLICY ccn_insert_internal
ON public.concierge_case_notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.concierge_is_internal(auth.uid())
  AND public.concierge_can_view_case(case_id, auth.uid())
  AND author_user_id = auth.uid()
  AND visibility IN ('internal', 'traveler')
);

-- Rastro automático en la línea de tiempo del expediente.
CREATE OR REPLACE FUNCTION public._concierge_note_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.concierge_case_timeline (case_id, event_type, severity, actor_user_id, summary, payload)
  VALUES (
    NEW.case_id,
    CASE WHEN NEW.visibility = 'traveler' THEN 'message_posted' ELSE 'internal_note_added' END,
    'info',
    NEW.author_user_id,
    left(NEW.body, 240),
    jsonb_build_object('note_id', NEW.id, 'visibility', NEW.visibility)
  );
  UPDATE public.concierge_cases
     SET last_activity_at = now(), updated_at = now()
   WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_concierge_note_timeline ON public.concierge_case_notes;
CREATE TRIGGER trg_concierge_note_timeline
AFTER INSERT ON public.concierge_case_notes
FOR EACH ROW EXECUTE FUNCTION public._concierge_note_timeline();