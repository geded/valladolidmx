CREATE OR REPLACE FUNCTION public._concierge_note_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_event_id TEXT;
  v_rec RECORD;
  v_any BOOLEAN := false;
BEGIN
  IF NEW.visibility IS DISTINCT FROM 'traveler' THEN
    RETURN NEW;
  END IF;

  SELECT id, traveler_user_id INTO v_case
    FROM public.concierge_cases WHERE id = NEW.case_id;
  IF v_case.id IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_id := 'concierge.message.created:' || NEW.id::text;

  IF NEW.author_user_id IS NOT DISTINCT FROM v_case.traveler_user_id THEN
    -- Escribió el viajero: avisar al concierge asignado.
    FOR v_rec IN
      SELECT DISTINCT ca.concierge_user_id AS user_id
        FROM public.concierge_assignments ca
       WHERE ca.case_id = NEW.case_id
         AND ca.released_at IS NULL
         AND ca.concierge_user_id IS NOT NULL
    LOOP
      v_any := true;
      PERFORM public.unc_publish_in_app(
        v_event_id || ':staff:' || v_rec.user_id::text,
        'Concierge.Message.Received', v_rec.user_id, 'concierge',
        'operational'::public.notification_category,
        jsonb_build_object('case_id', NEW.case_id, 'note_id', NEW.id, 'from', 'traveler')
      );
    END LOOP;

    IF NOT v_any THEN
      FOR v_rec IN
        SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'concierge_lead'
      LOOP
        PERFORM public.unc_publish_in_app(
          v_event_id || ':lead:' || v_rec.user_id::text,
          'Concierge.Message.Received', v_rec.user_id, 'concierge_lead',
          'operational'::public.notification_category,
          jsonb_build_object('case_id', NEW.case_id, 'note_id', NEW.id, 'from', 'traveler')
        );
      END LOOP;
    END IF;
  ELSE
    -- Escribió el equipo: avisar al viajero.
    IF v_case.traveler_user_id IS NOT NULL THEN
      PERFORM public.unc_publish_in_app(
        v_event_id || ':traveler',
        'Concierge.Message.Received', v_case.traveler_user_id, 'traveler',
        'transactional'::public.notification_category,
        jsonb_build_object('case_id', NEW.case_id, 'note_id', NEW.id, 'from', 'concierge')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._concierge_note_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_concierge_note_notify ON public.concierge_case_notes;
CREATE TRIGGER trg_concierge_note_notify
AFTER INSERT ON public.concierge_case_notes
FOR EACH ROW EXECUTE FUNCTION public._concierge_note_notify();