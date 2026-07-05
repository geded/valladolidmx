-- 1) Owner read: business members (editor+) pueden leer reseñas de su empresa
DROP POLICY IF EXISTS "reviews_business_owner_read" ON public.reviews;
CREATE POLICY "reviews_business_owner_read" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      (subject_kind = 'business' AND public.has_business_access(auth.uid(), subject_id, 'editor'))
      OR (subject_kind = 'product' AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = subject_id
          AND public.has_business_access(auth.uid(), p.business_id, 'editor')
      ))
    )
  );

-- 2) set_business_response — SECURITY DEFINER; sólo toca business_response*
CREATE OR REPLACE FUNCTION public.set_business_response(
  _review_id UUID,
  _response TEXT
)
RETURNS TABLE(id UUID, business_response TEXT, business_response_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_kind public.entity_kind;
  v_subject_id UUID;
  v_business_id UUID;
  v_allowed BOOLEAN;
  v_clean TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT r.subject_kind, r.subject_id
    INTO v_subject_kind, v_subject_id
  FROM public.reviews r
  WHERE r.id = _review_id AND r.deleted_at IS NULL;

  IF v_subject_kind IS NULL THEN
    RAISE EXCEPTION 'review_not_found';
  END IF;

  IF v_subject_kind = 'business' THEN
    v_business_id := v_subject_id;
  ELSIF v_subject_kind = 'product' THEN
    SELECT p.business_id INTO v_business_id FROM public.products p WHERE p.id = v_subject_id;
  ELSE
    RAISE EXCEPTION 'unsupported_subject_kind';
  END IF;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'business_not_found';
  END IF;

  v_allowed := public.has_business_access(auth.uid(), v_business_id, 'editor');
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Normaliza: cadena vacía → NULL (borra la respuesta)
  v_clean := NULLIF(btrim(COALESCE(_response, '')), '');
  IF v_clean IS NOT NULL AND length(v_clean) > 2000 THEN
    RAISE EXCEPTION 'response_too_long';
  END IF;

  RETURN QUERY
  UPDATE public.reviews r
     SET business_response = v_clean,
         business_response_at = CASE WHEN v_clean IS NULL THEN NULL ELSE now() END,
         updated_by = auth.uid()
   WHERE r.id = _review_id
   RETURNING r.id, r.business_response, r.business_response_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_business_response(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_business_response(UUID, TEXT) TO authenticated;