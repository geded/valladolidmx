CREATE OR REPLACE FUNCTION public.eb_comment_reopen(_comment_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.has_role(_uid,'editor') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.eb_block_comments
     SET resolved_at = NULL, resolved_by = NULL
   WHERE id = _comment_id
     AND (author_id = _uid OR resolved_by = _uid
          OR public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin'));
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
END;
$function$;