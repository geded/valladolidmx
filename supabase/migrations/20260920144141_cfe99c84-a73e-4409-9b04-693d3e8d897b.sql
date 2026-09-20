-- Aislar campos internos de revisión en public.businesses
REVOKE SELECT, UPDATE ON public.businesses FROM anon, authenticated;

GRANT SELECT (id, destination_id, primary_category_id, slug, legal_name, display_name, tagline, description, logo_media_id, cover_media_id, status, published_at, verified, metadata, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by, can_self_publish, is_demo_seed, demo_seed_batch, demo_source_url, record_origin, source_review_state, last_verified_at, verification_due_at, filter_attributes)
ON public.businesses TO anon, authenticated;

GRANT UPDATE (destination_id, primary_category_id, slug, legal_name, display_name, tagline, description, logo_media_id, cover_media_id, status, published_at, verified, metadata, updated_at, updated_by, deleted_at, deleted_by, can_self_publish, is_demo_seed, demo_seed_batch, demo_source_url, record_origin, source_review_state, last_verified_at, verification_due_at, filter_attributes)
ON public.businesses TO authenticated;

GRANT ALL ON public.businesses TO service_role;

-- Acceso acreditado al estado interno de revisión (dueños y administradores)
CREATE OR REPLACE FUNCTION public.business_review_state(_business_ids uuid[] DEFAULT NULL)
RETURNS TABLE(business_id uuid, review_notes text, submitted_for_review_at timestamptz, has_verification_document boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id,
         b.review_notes,
         b.submitted_for_review_at,
         coalesce(length(btrim(coalesce(b.verification_document_url, ''))) > 0, false)
  FROM public.businesses b
  WHERE b.deleted_at IS NULL
    AND (_business_ids IS NULL OR b.id = ANY(_business_ids))
    AND (
      public.is_admin(auth.uid())
      OR public.has_business_access(auth.uid(), b.id, 'viewer'::business_user_role)
    );
$$;

REVOKE ALL ON FUNCTION public.business_review_state(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_review_state(uuid[]) TO authenticated, service_role;