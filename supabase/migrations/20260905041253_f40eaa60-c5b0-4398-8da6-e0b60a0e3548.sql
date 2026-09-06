CREATE OR REPLACE FUNCTION public.eb_set_composition_seo_metadata(
  _id uuid,
  _kind public.eb_page_kind DEFAULT NULL,
  _canonical_override text DEFAULT NULL,
  _robots_directive text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (
    public.has_role(_uid, 'super_admin') OR
    public.has_role(_uid, 'admin') OR
    public.has_role(_uid, 'editor')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _robots_directive IS NOT NULL AND _robots_directive !~ '^[a-z,\- ]+$' THEN
    RAISE EXCEPTION 'invalid_robots_directive' USING ERRCODE = '22023';
  END IF;

  UPDATE public.page_compositions
     SET kind = COALESCE(_kind, kind),
         canonical_override = COALESCE(_canonical_override, canonical_override),
         robots_directive = COALESCE(_robots_directive, robots_directive),
         updated_by = _uid
   WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES (
    'composition', _id, 'Composition.SeoMetadataUpdated', _uid,
    jsonb_build_object(
      'kind', _kind,
      'canonical_override', _canonical_override,
      'robots_directive', _robots_directive
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.eb_set_composition_seo_metadata(uuid, public.eb_page_kind, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_set_composition_seo_metadata(uuid, public.eb_page_kind, text, text) TO authenticated, service_role;