
-- 1) Products: require parent business published + not deleted
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
FOR SELECT TO anon, authenticated
USING (
  status = 'published'::content_status
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = products.business_id
      AND b.status = 'published'::content_status
      AND b.deleted_at IS NULL
  )
);

-- 2) Promotions: when business_id is set, require its business published + not deleted
DROP POLICY IF EXISTS promotions_public_read ON public.promotions;
CREATE POLICY promotions_public_read ON public.promotions
FOR SELECT TO anon, authenticated
USING (
  status = 'published'::content_status
  AND deleted_at IS NULL
  AND (
    business_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = promotions.business_id
        AND b.status = 'published'::content_status
        AND b.deleted_at IS NULL
    )
  )
);

-- 3) FAQs: parent entity must be published when linked to a status-bearing entity
CREATE OR REPLACE FUNCTION public.faq_parent_is_public(_kind entity_kind, _id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF _kind IS NULL OR _id IS NULL THEN
    RETURN TRUE;
  END IF;
  CASE _kind
    WHEN 'business' THEN
      RETURN EXISTS (SELECT 1 FROM public.businesses t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'product' THEN
      RETURN EXISTS (SELECT 1 FROM public.products t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'destination' THEN
      RETURN EXISTS (SELECT 1 FROM public.destinations t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'destination_zone' THEN
      RETURN EXISTS (SELECT 1 FROM public.destination_zones t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'tourism_region' THEN
      RETURN EXISTS (SELECT 1 FROM public.tourism_regions t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'event' THEN
      RETURN EXISTS (SELECT 1 FROM public.events t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'article' THEN
      RETURN EXISTS (SELECT 1 FROM public.articles t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'page' THEN
      RETURN EXISTS (SELECT 1 FROM public.pages t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'promotion' THEN
      RETURN EXISTS (SELECT 1 FROM public.promotions t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'banner' THEN
      RETURN EXISTS (SELECT 1 FROM public.banners t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'route' THEN
      RETURN EXISTS (SELECT 1 FROM public.editorial_routes t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'point_of_interest' THEN
      RETURN EXISTS (SELECT 1 FROM public.points_of_interest t WHERE t.id = _id AND t.status = 'published'::content_status AND t.deleted_at IS NULL);
    WHEN 'business_category' THEN
      RETURN EXISTS (SELECT 1 FROM public.business_categories t WHERE t.id = _id);
    WHEN 'country' THEN
      RETURN EXISTS (SELECT 1 FROM public.countries t WHERE t.id = _id);
    WHEN 'state' THEN
      RETURN EXISTS (SELECT 1 FROM public.states t WHERE t.id = _id);
    ELSE
      -- Unknown/non-public entity kinds: deny by default
      RETURN FALSE;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.faq_parent_is_public(entity_kind, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS faqs_public_read ON public.faqs;
CREATE POLICY faqs_public_read ON public.faqs
FOR SELECT TO anon, authenticated
USING (
  status = 'published'::content_status
  AND deleted_at IS NULL
  AND public.faq_parent_is_public(entity_kind, entity_id)
);

-- 4) Webhook signing secrets: not selectable by authenticated role
REVOKE SELECT (secret_current, secret_previous) ON public.notification_webhook_endpoints FROM authenticated;
REVOKE SELECT (secret_current, secret_previous) ON public.notification_webhook_endpoints FROM anon;
