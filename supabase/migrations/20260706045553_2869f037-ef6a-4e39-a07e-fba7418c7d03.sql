
-- 1) Revoke EXECUTE from anon/authenticated/public on internal SECURITY DEFINER helpers and trigger functions
REVOKE EXECUTE ON FUNCTION public._concierge_proposal_publish_to_traveler(text, text, uuid, notification_category, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_publish_case_created(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_publish_request_created(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_quote_publish_to_business(text, text, uuid, notification_category, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_quote_publish_to_case_staff(text, text, uuid, notification_category, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_touch_activity_from_child() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._order_recompute_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_roles_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.eb_notify_block_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.eb_notify_workflow_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.eb_page_slug_redirect_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.eb_reset_workflow_on_publish() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_traveler_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_system_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unc_dead_letter_alert() FROM PUBLIC, anon, authenticated;

-- 2) Tighten related_overrides public read to only rows whose referenced (source + related) entities are published and not deleted
DROP POLICY IF EXISTS related_overrides_public_read ON public.related_overrides;

CREATE POLICY related_overrides_public_read ON public.related_overrides
FOR SELECT
USING (
  (
    (entity_type = 'business' AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = entity_id AND b.status = 'published' AND b.deleted_at IS NULL
    ))
    OR (entity_type = 'product' AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = entity_id AND p.status = 'published' AND p.deleted_at IS NULL
    ))
    OR (entity_type = 'destination' AND EXISTS (
      SELECT 1 FROM public.destinations d
      WHERE d.id = entity_id AND d.status = 'published' AND d.deleted_at IS NULL
    ))
    OR (entity_type = 'event' AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = entity_id AND e.status = 'published' AND e.deleted_at IS NULL
    ))
  )
  AND (
    (related_entity_type = 'business' AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = related_entity_id AND b.status = 'published' AND b.deleted_at IS NULL
    ))
    OR (related_entity_type = 'product' AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = related_entity_id AND p.status = 'published' AND p.deleted_at IS NULL
    ))
    OR (related_entity_type = 'destination' AND EXISTS (
      SELECT 1 FROM public.destinations d
      WHERE d.id = related_entity_id AND d.status = 'published' AND d.deleted_at IS NULL
    ))
    OR (related_entity_type = 'event' AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = related_entity_id AND e.status = 'published' AND e.deleted_at IS NULL
    ))
  )
);
