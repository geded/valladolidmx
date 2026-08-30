CREATE OR REPLACE FUNCTION public.admin_set_place_presentation_mode(_place_id uuid, _mode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _has_cover boolean;
BEGIN
  IF NOT (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _mode IS NULL OR _mode NOT IN ('editorial','cinematic') THEN
    RAISE EXCEPTION 'invalid_presentation_mode';
  END IF;
  IF _mode = 'cinematic' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.place_media pm
      JOIN public.media_assets ma ON ma.id = pm.media_asset_id
      WHERE pm.place_id = _place_id
        AND pm.role = 'cover'
        AND ma.review_state = 'approved'
    ) INTO _has_cover;
    IF NOT _has_cover THEN
      RAISE EXCEPTION 'cinematic_requires_approved_cover';
    END IF;
  END IF;
  UPDATE public.points_of_interest
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('presentation_mode', _mode),
         updated_by = auth.uid()
   WHERE id = _place_id
     AND deleted_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_place_presentation_mode(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_place_presentation_mode(uuid, text) TO authenticated;