-- US-04 · Notificaciones editoriales para Experience Builder
-- Triggers que publican notificaciones in-app cuando cambia el flujo editorial
-- o cuando se crea un comentario en un bloque. Reutiliza `unc_publish_in_app`.

CREATE OR REPLACE FUNCTION public.eb_notify_workflow_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := NEW.workflow_updated_by;
  _recipient uuid;
  _event_type text;
  _payload jsonb;
  _audience text;
BEGIN
  IF NEW.workflow_state IS NOT DISTINCT FROM OLD.workflow_state THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'composition_id', NEW.id,
    'slug', NEW.slug,
    'title', NEW.title,
    'from_state', OLD.workflow_state,
    'to_state', NEW.workflow_state,
    'notes', NEW.workflow_notes,
    'actor_id', _actor
  );

  IF NEW.workflow_state = 'in_review' THEN
    _event_type := 'eb.workflow.review_requested';
    _audience := 'staff:reviewers';
    -- Notificar a admins y super_admins
    FOR _recipient IN
      SELECT DISTINCT user_id FROM public.user_roles
      WHERE role IN ('admin', 'super_admin')
    LOOP
      IF _recipient IS DISTINCT FROM _actor THEN
        PERFORM public.unc_publish_in_app(
          'eb-wf-' || NEW.id::text || '-' || NEW.workflow_updated_at::text || '-' || _recipient::text,
          _event_type, _recipient, _audience, 'operational'::notification_category, _payload
        );
      END IF;
    END LOOP;
  ELSIF NEW.workflow_state = 'approved' THEN
    _event_type := 'eb.workflow.approved';
    _audience := 'page:editors';
    -- Notificar al creador y al último editor
    FOR _recipient IN
      SELECT DISTINCT uid FROM (VALUES (NEW.created_by), (NEW.updated_by)) AS t(uid)
      WHERE uid IS NOT NULL
    LOOP
      IF _recipient IS DISTINCT FROM _actor THEN
        PERFORM public.unc_publish_in_app(
          'eb-wf-' || NEW.id::text || '-' || NEW.workflow_updated_at::text || '-' || _recipient::text,
          _event_type, _recipient, _audience, 'operational'::notification_category, _payload
        );
      END IF;
    END LOOP;
  ELSIF NEW.workflow_state = 'draft' AND OLD.workflow_state = 'approved' THEN
    _event_type := 'eb.workflow.reopened';
    _audience := 'page:editors';
    FOR _recipient IN
      SELECT DISTINCT uid FROM (VALUES (NEW.created_by), (NEW.updated_by)) AS t(uid)
      WHERE uid IS NOT NULL
    LOOP
      IF _recipient IS DISTINCT FROM _actor THEN
        PERFORM public.unc_publish_in_app(
          'eb-wf-' || NEW.id::text || '-' || NEW.workflow_updated_at::text || '-' || _recipient::text,
          _event_type, _recipient, _audience, 'operational'::notification_category, _payload
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_notify_workflow_change ON public.page_compositions;
CREATE TRIGGER trg_eb_notify_workflow_change
AFTER UPDATE OF workflow_state ON public.page_compositions
FOR EACH ROW EXECUTE FUNCTION public.eb_notify_workflow_change();


CREATE OR REPLACE FUNCTION public.eb_notify_block_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _comp public.page_compositions%ROWTYPE;
  _recipient uuid;
  _payload jsonb;
BEGIN
  SELECT * INTO _comp FROM public.page_compositions WHERE id = NEW.composition_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  _payload := jsonb_build_object(
    'composition_id', NEW.composition_id,
    'slug', _comp.slug,
    'title', _comp.title,
    'block_id', NEW.block_id,
    'comment_id', NEW.id,
    'body_preview', LEFT(NEW.body, 240),
    'actor_id', NEW.author_id
  );

  -- Notificar creador y último editor + participantes previos del hilo del mismo bloque
  FOR _recipient IN
    SELECT DISTINCT uid FROM (
      SELECT _comp.created_by AS uid
      UNION SELECT _comp.updated_by
      UNION SELECT author_id FROM public.eb_block_comments
        WHERE composition_id = NEW.composition_id AND block_id = NEW.block_id AND id <> NEW.id
    ) t WHERE uid IS NOT NULL
  LOOP
    IF _recipient IS DISTINCT FROM NEW.author_id THEN
      PERFORM public.unc_publish_in_app(
        'eb-cmt-' || NEW.id::text || '-' || _recipient::text,
        'eb.comment.created', _recipient, 'page:editors',
        'operational'::notification_category, _payload
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_notify_block_comment ON public.eb_block_comments;
CREATE TRIGGER trg_eb_notify_block_comment
AFTER INSERT ON public.eb_block_comments
FOR EACH ROW EXECUTE FUNCTION public.eb_notify_block_comment();