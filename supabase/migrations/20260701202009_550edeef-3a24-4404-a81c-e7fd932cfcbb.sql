
-- 1) Fix mutable search_path on public pgmq wrappers + lock to server-side
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, pg_temp;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 2) Revoke EXECUTE on internal SECURITY DEFINER helpers / trigger functions
REVOKE EXECUTE ON FUNCTION public._concierge_proposal_publish_to_traveler(text, text, uuid, notification_category, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_publish_case_created(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_publish_request_created(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_quote_publish_to_business(text, text, uuid, notification_category, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_quote_publish_to_case_staff(text, text, uuid, notification_category, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._concierge_touch_activity_from_child() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_traveler_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unc_dead_letter_alert() FROM PUBLIC, anon, authenticated;

-- 3) Tighten permissive public-read RLS policies

DROP POLICY IF EXISTS business_category_links_public_read ON public.business_category_links;
CREATE POLICY business_category_links_public_read ON public.business_category_links
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses b
           WHERE b.id = business_category_links.business_id
             AND b.status = 'published' AND b.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM public.business_categories c
           WHERE c.id = business_category_links.category_id
             AND c.status = 'published' AND c.deleted_at IS NULL)
);

DROP POLICY IF EXISTS business_hours_public_read ON public.business_hours;
CREATE POLICY business_hours_public_read ON public.business_hours
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses b
           WHERE b.id = business_hours.business_id
             AND b.status = 'published' AND b.deleted_at IS NULL)
);

DROP POLICY IF EXISTS business_locations_public_read ON public.business_locations;
CREATE POLICY business_locations_public_read ON public.business_locations
FOR SELECT USING (
  business_locations.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM public.businesses b
           WHERE b.id = business_locations.business_id
             AND b.status = 'published' AND b.deleted_at IS NULL)
);

DROP POLICY IF EXISTS business_media_public_read ON public.business_media;
CREATE POLICY business_media_public_read ON public.business_media
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses b
           WHERE b.id = business_media.business_id
             AND b.status = 'published' AND b.deleted_at IS NULL)
);

DROP POLICY IF EXISTS business_social_links_public_read ON public.business_social_links;
CREATE POLICY business_social_links_public_read ON public.business_social_links
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses b
           WHERE b.id = business_social_links.business_id
             AND b.status = 'published' AND b.deleted_at IS NULL)
);

DROP POLICY IF EXISTS product_media_public_read ON public.product_media;
CREATE POLICY product_media_public_read ON public.product_media
FOR SELECT USING (
  EXISTS (SELECT 1
            FROM public.products p
            JOIN public.businesses b ON b.id = p.business_id
           WHERE p.id = product_media.product_id
             AND p.status = 'published' AND p.deleted_at IS NULL
             AND b.status = 'published' AND b.deleted_at IS NULL)
);

-- 4) eb_themes: restrict public read to globally-scoped themes.
DROP POLICY IF EXISTS eb_themes_read_public ON public.eb_themes;
CREATE POLICY eb_themes_read_public ON public.eb_themes
FOR SELECT USING (scope = 'global'::public.eb_scope);
