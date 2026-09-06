-- Sustituye la firma de cuatro argumentos dentro de esta misma transacción para
-- evitar overloads ambiguos en PostgREST; no elimina ni modifica datos.
DROP FUNCTION IF EXISTS public.eb_set_composition_seo_metadata(uuid, public.eb_page_kind, text, text);

CREATE OR REPLACE FUNCTION public.eb_set_composition_seo_metadata(
  _id uuid,
  _kind eb_page_kind DEFAULT NULL::eb_page_kind,
  _canonical_override text DEFAULT NULL::text,
  _robots_directive text DEFAULT NULL::text,
  _title text DEFAULT NULL::text,
  _description text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _page_type text;
  _status text;
  _published_at timestamptz;
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

  IF _title IS NOT NULL AND length(btrim(_title)) = 0 THEN
    RAISE EXCEPTION 'title cannot be empty' USING ERRCODE = '22023';
  END IF;

  SELECT page_type, status, published_at
    INTO _page_type, _status, _published_at
    FROM public.page_compositions
   WHERE id = _id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002';
  END IF;
  IF _page_type IS DISTINCT FROM 'landing' THEN
    RAISE EXCEPTION 'seo_metadata_requires_landing' USING ERRCODE = '22023';
  END IF;
  IF _status = 'published' OR _published_at IS NOT NULL THEN
    RAISE EXCEPTION 'seo_metadata_requires_draft_landing' USING ERRCODE = '22023';
  END IF;
  IF _kind IS NOT NULL AND _kind <> 'landing'::eb_page_kind THEN
    RAISE EXCEPTION 'seo_metadata_invalid_kind' USING ERRCODE = '22023';
  END IF;

  UPDATE public.page_compositions
     SET kind = COALESCE(_kind, kind),
         title = COALESCE(_title, title),
         description = CASE WHEN _description IS NULL THEN description ELSE NULLIF(btrim(_description), '') END,
         canonical_override = CASE WHEN _canonical_override IS NULL THEN canonical_override ELSE NULLIF(btrim(_canonical_override), '') END,
         robots_directive = COALESCE(_robots_directive, robots_directive),
         updated_by = _uid,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES (
    'composition', _id, 'Composition.SeoMetadataUpdated', _uid,
    jsonb_build_object(
      'kind', _kind,
      'title', _title,
      'description_updated', _description IS NOT NULL,
      'canonical_override', _canonical_override,
      'robots_directive', _robots_directive
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.eb_set_composition_seo_metadata(uuid, eb_page_kind, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eb_set_composition_seo_metadata(uuid, eb_page_kind, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.eb_set_composition_seo_metadata(uuid, eb_page_kind, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_set_composition_seo_metadata(uuid, eb_page_kind, text, text, text, text) TO service_role;
