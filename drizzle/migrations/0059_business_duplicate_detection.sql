CREATE OR REPLACE FUNCTION public.find_similar_businesses(_name text, _exclude_id uuid DEFAULT NULL, _limit int DEFAULT 5)
RETURNS TABLE (id uuid, display_name text, slug text, destination_name text, score real)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH q AS (SELECT lower(unaccent(trim(coalesce(_name,'')))) AS n)
  SELECT b.id, b.display_name, b.slug, d.name, similarity(lower(unaccent(b.display_name)), q.n) AS score
    FROM public.businesses b
    CROSS JOIN q
    LEFT JOIN public.destinations d ON d.id = b.destination_id
   WHERE auth.uid() IS NOT NULL
     AND length(q.n) >= 3
     AND b.deleted_at IS NULL
     AND b.status <> 'archived'
     AND (_exclude_id IS NULL OR b.id <> _exclude_id)
     AND (similarity(lower(unaccent(b.display_name)), q.n) >= 0.35
          OR (length(q.n) >= 4 AND lower(unaccent(b.display_name)) LIKE '%' || q.n || '%')
          OR (length(b.display_name) >= 4 AND q.n LIKE '%' || lower(unaccent(b.display_name)) || '%'))
   ORDER BY score DESC
   LIMIT least(greatest(coalesce(_limit,5),1),10);
$$;
REVOKE ALL ON FUNCTION public.find_similar_businesses(text, uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_similar_businesses(text, uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_business_registration(_business_id uuid, _approve boolean, _notes text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id) THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT user_id INTO _owner FROM public.business_users
   WHERE business_id = _business_id AND role = 'owner' AND status = 'pending' LIMIT 1;
  IF _approve THEN
    UPDATE public.business_users SET status = 'active'
     WHERE business_id = _business_id AND role = 'owner' AND status = 'pending';
    UPDATE public.businesses SET status = 'approved', updated_by = _uid WHERE id = _business_id;
  ELSE
    UPDATE public.business_users SET status = 'removed'
     WHERE business_id = _business_id AND status = 'pending';
    UPDATE public.businesses
       SET status = 'archived', updated_by = _uid,
           review_notes = COALESCE(NULLIF(trim(_notes), ''), review_notes)
     WHERE id = _business_id;
  END IF;
  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, scope_type, scope_id)
  VALUES (_uid, _owner,
          CASE WHEN _approve THEN 'business_registration_approved' ELSE 'business_registration_rejected' END,
          'owner', 'business', _business_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_my_rejected_business_requests()
RETURNS TABLE (kind text, business_id uuid, business_name text, notes text, decided_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 'claim', t.business_id, b.display_name, t.notes, coalesce(t.responded_at, t.updated_at)
    FROM public.business_ownership_transfers t
    JOIN public.businesses b ON b.id = t.business_id
   WHERE t.to_user_id = auth.uid() AND t.status = 'rejected'
     AND coalesce(t.responded_at, t.updated_at) > now() - interval '60 days'
  UNION ALL
  SELECT 'registration', b.id, b.display_name, b.review_notes, b.updated_at
    FROM public.business_users bu
    JOIN public.businesses b ON b.id = bu.business_id
   WHERE bu.user_id = auth.uid() AND bu.role = 'owner' AND bu.status = 'removed'
     AND b.status = 'archived' AND b.updated_at > now() - interval '60 days'
  ORDER BY 5 DESC
  LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.list_my_rejected_business_requests() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_my_rejected_business_requests() TO authenticated;